import { fromJSONObject } from '../json/index.js';
import { isXconObject, normalize, type XconObject, type XconValue } from '../../model/index.js';

type XconDocument = XconObject;

interface SketchLine {
  number: number;
  indent: number;
  text: string;
}

interface SketchComponent {
  name: string;
  props: Record<string, unknown>;
  children: SketchComponent[];
}

type SketchContainer =
  | { kind: 'root'; indent: number; target: Record<string, unknown>; children: SketchComponent[] }
  | { kind: 'component'; indent: number; component: SketchComponent; children: SketchComponent[] }
  | { kind: 'array'; indent: number; items: unknown[] }
  | { kind: 'object'; indent: number; target: Record<string, unknown> };

const quotedTokenPrefix = '\u0000quoted:';

export class SketchParseError extends SyntaxError {
  constructor(message: string, readonly line: number, readonly column = 1) {
    super(`XCON/SKETCH parse error at line ${line}: ${message}`);
    this.name = 'SketchParseError';
  }
}

export function parseXconSketch(source: string): XconDocument {
  return fromSketch(source);
}

export function fromSketch(source: string): XconDocument {
  const lines = preprocessLines(source);
  const root = parseRoot(lines);
  normalizeSketchAliases(root);
  return fromJSONObject(root);
}

export function toSketch(document: XconObject, options: { pretty?: boolean } = {}): string {
  const lines: string[] = [];
  const indent = options.pretty === false ? '' : '  ';
  const pos = rectParts(document.get('pos'));
  const name = document.get('name');
  const title = document.get('title');
  const label = typeof name === 'string' && name ? name : typeof title === 'string' && title ? undefined : undefined;

  lines.push(`screen${label ? ` ${formatSketchScalar(label)}` : ''} ${pos[2]}x${pos[3]}`);
  document.forEach((value, key) => {
    if (key === 'type' || key === 'name' || key === 'pos' || key === 'components') return;
    writeSketchProperty(lines, indent, key, value);
  });

  writeSketchComponents(lines, document.get('components'), indent);
  return lines.join('\n');
}

function parseRoot(lines: SketchLine[]): Record<string, unknown> {
  if (lines.length === 0) throw new SketchParseError('Expected screen declaration.', 1);

  const root: Record<string, unknown> = {
    type: 'form',
    pos: [0, 0, 360, 220],
  };
  const components: SketchComponent[] = [];
  const stack: SketchContainer[] = [{ kind: 'root', indent: -1, target: root, children: components }];
  const counts = new Map<string, number>();
  let hasScreen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.text.startsWith('screen ')) {
      if (line.indent !== 0) throw new SketchParseError('Screen declaration must not be indented.', line.number);
      Object.assign(root, parseScreen(line));
      hasScreen = true;
      continue;
    }

    if (!hasScreen) throw new SketchParseError('Expected root screen declaration.', line.number);

    while (line.indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];

    if (line.text.startsWith('- ')) {
      if (parent.kind !== 'array') throw new SketchParseError('Array item must be indented under an array property.', line.number);
      parent.items.push(parseScalar(line.text.slice(2).trim(), line));
      continue;
    }

    if (isComponentDeclaration(line.text)) {
      if (parent.kind !== 'root' && parent.kind !== 'component') {
        throw new SketchParseError('Components must be declared under a screen or component.', line.number);
      }

      const component = parseComponent(line, counts);
      parent.children.push(component);
      stack.push({ kind: 'component', indent: line.indent, component, children: component.children });
      continue;
    }

    if (parent.kind === 'object') {
      const consumedJsonPropertyIndex = consumeJsonProperty(parent.target, lines, index);
      if (consumedJsonPropertyIndex !== null) {
        index = consumedJsonPropertyIndex;
        continue;
      }

      applyObjectProperty(parent.target, line);
      continue;
    }

    if (parent.kind === 'array') throw new SketchParseError('Array items must start with "- ".', line.number);

    const target = parent.kind === 'component' ? parent.component.props : parent.target;
    const consumedJsonPropertyIndex = consumeJsonProperty(target, lines, index);
    if (consumedJsonPropertyIndex !== null) {
      index = consumedJsonPropertyIndex;
      continue;
    }

    if (isBlockProperty(line, lines[index + 1])) {
      stack.push(createBlockProperty(target, line, lines[index + 1]));
      continue;
    }

    applyProperty(target, line);
  }

  if (!hasScreen) throw new SketchParseError('Expected screen declaration.', lines[0]?.number ?? 1);
  if (components.length > 0) root.components = emitComponents(components);
  return root;
}

function preprocessLines(source: string): SketchLine[] {
  const rawLines = source.replace(/\r\n/g, '\n').split('\n');
  for (let index = 0; index < rawLines.length; index += 1) {
    if (rawLines[index].includes('\t')) {
      throw new SketchParseError('Tabs are not supported for indentation. Use spaces.', index + 1);
    }
  }

  const contentLines = rawLines.filter((raw) => stripComment(raw).trim());
  const commonIndent =
    contentLines.length === 0
      ? 0
      : Math.min(...contentLines.map((raw) => raw.length - raw.trimStart().length));

  return rawLines
    .map((raw, index) => {
      if (raw.includes('\t')) {
        throw new SketchParseError('Tabs are not supported for indentation. Use spaces.', index + 1);
      }

      const dedented = raw.slice(commonIndent);
      const withoutComment = stripComment(dedented);
      const text = withoutComment.trim();
      if (!text) return null;

      return {
        number: index + 1,
        indent: withoutComment.length - withoutComment.trimStart().length,
        text,
      };
    })
    .filter((line): line is SketchLine => Boolean(line));
}

function stripComment(raw: string): string {
  let quoted = false;
  for (let index = 0; index < raw.length - 1; index += 1) {
    const char = raw[index];
    if (char === '"' && raw[index - 1] !== '\\') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === '/' && raw[index + 1] === '/' && (index === 0 || /\s/.test(raw[index - 1]))) {
      return raw.slice(0, index);
    }
  }
  return raw;
}

function parseScreen(line: SketchLine): Record<string, unknown> {
  const tokens = tokenize(line.text);
  if (tokens.shift() !== 'screen') throw new SketchParseError('Expected screen declaration.', line.number);

  const root: Record<string, unknown> = { type: 'form' };
  if (tokens.length === 0) throw new SketchParseError('Expected screen size like 390x844.', line.number);

  if (tokens[0] && !isSizeToken(tokens[0])) {
    root.name = parseStringToken(tokens.shift() as string, line);
  }

  const size = tokens.shift();
  if (!size) throw new SketchParseError('Expected screen size like 390x844.', line.number);

  const dimensions = parseDimensions(size);
  if (!dimensions) throw new SketchParseError('Expected screen size like 390x844.', line.number);
  root.pos = [0, 0, dimensions[0], dimensions[1]];

  applyInlineProps(root, tokens, line);
  return root;
}

function isComponentDeclaration(text: string): boolean {
  return (
    /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*/.test(text) ||
    /^[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(text)
  );
}

function parseComponent(line: SketchLine, counts: Map<string, number>): SketchComponent {
  const tokens = tokenize(line.text);
  const first = tokens.shift();
  if (!first) throw new SketchParseError('Expected component declaration.', line.number);

  let name: string;
  let type: string;
  if (tokens[0] === ':') {
    name = first;
    tokens.shift();
    const explicitType = tokens.shift();
    if (!explicitType) throw new SketchParseError('Expected component type after name.', line.number);
    type = explicitType;
  } else {
    type = first;
    name = nextComponentName(type, counts);
  }

  const props: Record<string, unknown> = { type, name };
  const text = tokens[0] && tokens[0] !== 'at' ? parseStringToken(tokens.shift() as string, line) : undefined;
  Object.assign(props, primaryText(type, text));

  if (tokens.shift() !== 'at') throw new SketchParseError('Expected component layout: at x y width height.', line.number);
  props.pos = parsePosition(tokens, line);
  applyInlineProps(props, tokens, line);

  return { name, props, children: [] };
}

function parsePosition(tokens: string[], line: SketchLine): number[] {
  const first = tokens.shift();
  if (!first) throw new SketchParseError('Expected position after at.', line.number);

  const pos = parseNumberListToken(first, line);
  while (pos.length < 4 && tokens[0] && isNumberToken(tokens[0])) {
    pos.push(parseNumber(tokens.shift() as string, line));
  }
  return pos;
}

function applyInlineProps(target: Record<string, unknown>, tokens: string[], line: SketchLine): void {
  let index = 0;
  while (index < tokens.length) {
    const key = normalizePropName(tokens[index]);
    const value = tokens[index + 1];
    if (!key || value === undefined) throw new SketchParseError('Expected inline property name and value.', line.number);

    if (key === 'size') {
      target.size = parseSizeValue(value, line);
    } else {
      target[key] = parseScalar(value, line);
    }
    index += 2;
  }
}

function applyProperty(props: Record<string, unknown>, line: SketchLine): void {
  const tokens = tokenize(line.text);
  const key = tokens[0];
  const values = tokens.slice(1);
  if (!key || values.length === 0) throw new SketchParseError('Property requires a name and value.', line.number);

  if (key === 'bg') props.backgroundColor = required(values, line, 'bg requires a color.');
  else if (key === 'color') props.color = required(values, line, 'color requires a value.');
  else if (key === 'font') props.font = parseFont(values, line);
  else if (key === 'align') props.textAlign = required(values, line, 'align requires a value.');
  else if (key === 'valign') props.textVerticalAlign = required(values, line, 'valign requires a value.');
  else if (key === 'radius') mergeObject(props, 'border', { radius: parseNumber(required(values, line, 'radius requires a number.'), line) });
  else if (key === 'border') mergeObject(props, 'border', parseBorder(values, line));
  else if (key === 'shadow') props.shadow = parseShadow(values, line);
  else if (key === 'gap') mergeObject(props, 'al', { gap: parseScalar(required(values, line, 'gap requires a value.'), line) });
  else if (key === 'padding') mergeObject(props, 'al', { padding: parseSpacing(values, line) });
  else if (key === 'layout') {
    const layout = required(values, line, 'layout requires a value.');
    if (props.type === 'button') props.layout = layout;
    else mergeObject(props, 'al', { direction: layout });
  }
  else if (key === 'scroll') props.scroll = required(values, line, 'scroll requires a mode.');
  else props[normalizePropName(key)] = values.length === 1 ? parseScalar(values[0], line) : values.map((value) => parseScalar(value, line));
}

function applyObjectProperty(target: Record<string, unknown>, line: SketchLine): void {
  const tokens = tokenize(line.text);
  const key = tokens[0];
  if (!key || tokens.length < 2) throw new SketchParseError('Object property requires a name and value.', line.number);
  target[normalizePropName(key)] = tokens.length === 2 ? parseScalar(tokens[1], line) : tokens.slice(1).map((value) => parseScalar(value, line)).join(' ');
}

function consumeJsonProperty(target: Record<string, unknown>, lines: SketchLine[], index: number): number | null {
  const start = parseJsonPropertyStart(lines[index]);
  if (!start) return null;

  const fragments = [start.value];
  let endIndex = index;
  while (!isCompleteJsonValue(fragments.join('\n'))) {
    endIndex += 1;
    const next = lines[endIndex];
    if (!next) {
      throw new SketchParseError(`Unterminated JSON value for "${start.key}".`, lines[index].number);
    }
    fragments.push(next.text);
  }

  const json = fragments.join('\n');
  try {
    target[normalizePropName(start.key)] = JSON.parse(json);
  } catch {
    throw new SketchParseError(`Invalid JSON value for "${start.key}".`, lines[index].number);
  }
  return endIndex;
}

function parseJsonPropertyStart(line: SketchLine): { key: string; value: string } | null {
  const match = line.text.match(/^([A-Za-z_][\w-]*)\s+([\s\S]+)$/);
  if (!match) return null;

  const value = match[2].trim();
  if (!value.startsWith('{') && !value.startsWith('[')) return null;
  return { key: match[1], value };
}

function isCompleteJsonValue(value: string): boolean {
  let depth = 0;
  let quoted = false;
  let escaped = false;

  for (const char of value) {
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
    }
  }

  return depth === 0 && !quoted;
}

function isBlockProperty(line: SketchLine, next?: SketchLine): boolean {
  return tokenize(line.text).length === 1 && Boolean(next && next.indent > line.indent);
}

function createBlockProperty(props: Record<string, unknown>, line: SketchLine, next?: SketchLine): SketchContainer {
  const key = normalizePropName(line.text);
  if (!next) throw new SketchParseError('Block property requires indented content.', line.number);
  if (next.text.startsWith('- ')) {
    const items: unknown[] = [];
    props[key] = items;
    return { kind: 'array', indent: line.indent, items };
  }

  const target: Record<string, unknown> = {};
  props[key] = target;
  return { kind: 'object', indent: line.indent, target };
}

function required(values: string[], line: SketchLine, message: string): string {
  if (!values[0]) throw new SketchParseError(message, line.number);
  return parseStringToken(values[0], line);
}

function parseFont(values: string[], line: SketchLine): Record<string, unknown> {
  if (values.length < 1) throw new SketchParseError('font requires at least a size.', line.number);
  if (values.length === 1) return { size: parseScalar(values[0], line) };
  if (isNumberToken(values[0])) return { size: parseNumber(values[0], line), weight: parseScalar(values[1], line) };
  return {
    family: parseStringToken(values[0], line),
    size: parseScalar(values[1], line),
    ...(values[2] ? { weight: parseScalar(values[2], line) } : {}),
  };
}

function parseBorder(values: string[], line: SketchLine): Record<string, unknown> {
  if (values.length < 1) throw new SketchParseError('border requires width.', line.number);
  return {
    width: parseNumber(values[0], line),
    ...(values[1] ? { color: parseStringToken(values[1], line) } : {}),
    ...(values[2] ? { radius: parseNumber(values[2], line) } : {}),
  };
}

function parseShadow(values: string[], line: SketchLine): Record<string, unknown> {
  if (values.length < 4) throw new SketchParseError('shadow requires x y blur opacity.', line.number);
  return {
    x: parseNumber(values[0], line),
    y: parseNumber(values[1], line),
    blur: parseNumber(values[2], line),
    opacity: parseNumber(values[3], line),
  };
}

function parseSpacing(values: string[], line: SketchLine): unknown {
  if (values.length === 0) throw new SketchParseError('spacing requires at least one value.', line.number);
  if (values.length === 1) return parseScalar(values[0], line);
  return values.map((value) => parseNumber(value, line));
}

function parseScalar(value: string, line: SketchLine): unknown {
  if (value.startsWith(quotedTokenPrefix)) return value.slice(quotedTokenPrefix.length);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (isNumberToken(value)) return Number(value);
  if (isNumberListToken(value)) return value.split(',').map(Number);
  if (isSizeToken(value)) return parseDimensions(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try {
      return JSON.parse(value);
    } catch {
      throw new SketchParseError(`Invalid JSON value "${value}".`, line.number);
    }
  }
  return value;
}

function parseStringToken(value: string, line: SketchLine): string {
  const parsed = parseScalar(value, line);
  return parsed === null ? 'null' : String(parsed);
}

function parseSizeValue(value: string, line: SketchLine): unknown {
  if (isSizeToken(value)) return parseDimensions(value);
  return parseScalar(value, line);
}

function parseNumberListToken(value: string, line: SketchLine): number[] {
  if (isNumberListToken(value)) return value.split(',').map(Number);
  if (isNumberToken(value)) return [Number(value)];
  throw new SketchParseError('Expected numeric position.', line.number);
}

function parseNumber(value: string, line: SketchLine): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new SketchParseError(`Expected number but received "${value}".`, line.number);
  return number;
}

function isNumberToken(value: string): boolean {
  return /^-?(?:\d+|\d*\.\d+)$/.test(value);
}

function isNumberListToken(value: string): boolean {
  return /^-?(?:\d+|\d*\.\d+),-?(?:\d+|\d*\.\d+)(?:,-?(?:\d+|\d*\.\d+))*$/.test(value);
}

function isSizeToken(value: string): boolean {
  return /^-?(?:\d+|\d*\.\d+)x-?(?:\d+|\d*\.\d+)$/i.test(value);
}

function parseDimensions(value: string): [number, number] | null {
  const match = value.match(/^(-?(?:\d+|\d*\.\d+))x(-?(?:\d+|\d*\.\d+))$/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function normalizePropName(key: string): string {
  if (key === 'bg') return 'backgroundColor';
  return key;
}

function nextComponentName(type: string, counts: Map<string, number>): string {
  const count = (counts.get(type) ?? 0) + 1;
  counts.set(type, count);
  return `${type}${count}`;
}

function primaryText(type: string, text: string | undefined): Record<string, unknown> {
  if (text === undefined) return {};
  if (type === 'button') return { label: text };
  if (type === 'textField' || type === 'searchBar') return { placeholder: text };
  if (type === 'label' || type === 'textView' || type === 'shape') return { text };
  return { text };
}

function writeSketchComponents(lines: string[], value: XconValue | undefined, indent: string): void {
  if (!isXconObject(value)) return;

  for (const key of orderedComponentKeys(value)) {
    const component = value.get(key);
    if (!isXconObject(component)) continue;
    writeSketchComponent(lines, key, component, indent);
  }
}

function writeSketchComponent(lines: string[], name: string, component: XconObject, indent: string): void {
  const type = component.getString('type', 'panel');
  const pos = rectParts(component.get('pos'));
  const primaryKey = primaryTextProperty(type, component);
  const primaryValue = primaryKey ? component.get(primaryKey) : undefined;
  const primary = typeof primaryValue === 'string' && primaryValue ? ` ${formatSketchScalar(primaryValue)}` : '';

  lines.push(`${indent}${name}: ${type}${primary} at ${pos.join(' ')}`);
  component.forEach((value, key) => {
    if (key === 'type' || key === 'pos' || key === 'components') return;
    if (key === 'name' && value === name) return;
    if (key === primaryKey) return;
    writeSketchProperty(lines, `${indent}  `, key, value);
  });

  writeSketchComponents(lines, component.get('components'), `${indent}  `);
}

function writeSketchProperty(lines: string[], indent: string, key: string, value: XconValue): void {
  if (isXconObject(value)) {
    if (isSimpleObject(value)) {
      lines.push(`${indent}${key}`);
      value.forEach((child, childKey) => {
        writeSketchProperty(lines, `${indent}  `, childKey, child);
      });
      return;
    }

    lines.push(`${indent}${key} ${JSON.stringify(normalize(value))}`);
    return;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => !isXconObject(item) && !Array.isArray(item))) {
      lines.push(`${indent}${key}`);
      value.forEach((item) => {
        lines.push(`${indent}  - ${formatSketchScalar(item)}`);
      });
      return;
    }

    lines.push(`${indent}${key} ${JSON.stringify(normalize(value))}`);
    return;
  }

  lines.push(`${indent}${key} ${formatSketchScalar(value)}`);
}

function orderedComponentKeys(components: XconObject): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const order = components.get('componentsOrder');
  if (typeof order === 'string') {
    for (const key of order.split(',').map((item) => item.trim()).filter(Boolean)) {
      if (components.contains(key) && !seen.has(key)) {
        ordered.push(key);
        seen.add(key);
      }
    }
  }

  components.forEach((value, key) => {
    if (key !== 'componentsOrder' && isXconObject(value) && !seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  });

  return ordered;
}

function primaryTextProperty(type: string, component: XconObject): string | null {
  if (type === 'button' && typeof component.get('label') === 'string') return 'label';
  if ((type === 'textField' || type === 'searchBar') && typeof component.get('placeholder') === 'string') return 'placeholder';
  if ((type === 'label' || type === 'textView' || type === 'shape') && typeof component.get('text') === 'string') return 'text';
  return null;
}

function rectParts(value: XconValue | undefined): [number, number, number, number] {
  if (Array.isArray(value) && value.length >= 4) {
    const parts = value.slice(0, 4).map((item) => (typeof item === 'number' && Number.isFinite(item) ? item : Number(item)));
    if (parts.every((item) => Number.isFinite(item))) return parts as [number, number, number, number];
  }

  if (typeof value === 'string') {
    const parts = value.split(',').map((item) => Number(item.trim()));
    if (parts.length >= 4 && parts.slice(0, 4).every((item) => Number.isFinite(item))) {
      return parts.slice(0, 4) as [number, number, number, number];
    }
  }

  return [0, 0, 0, 0];
}

function isSimpleObject(object: XconObject): boolean {
  return object.every((value) => value === null || (!isXconObject(value) && !Array.isArray(value)));
}

function formatSketchScalar(value: XconValue): string {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  return JSON.stringify(normalize(value));
}

function emitComponents(components: SketchComponent[]): Record<string, unknown> {
  const output: Record<string, unknown> = {
    componentsOrder: components.map((component) => component.name).join(','),
  };

  for (const component of components) {
    if (component.children.length > 0) component.props.components = emitComponents(component.children);
    output[component.name] = component.props;
  }
  return output;
}

function mergeObject(target: Record<string, unknown>, key: string, patch: Record<string, unknown>): void {
  const current = target[key];
  target[key] = { ...(isRecord(current) ? current : {}), ...patch };
}

function normalizeSketchAliases(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(normalizeSketchAliases);
    return;
  }
  if (!isRecord(value)) return;

  const font = value.font;
  if (isRecord(font)) {
    if (value.textAlign === undefined && font.align !== undefined) {
      value.textAlign = font.align;
    }
    if (value.textVerticalAlign === undefined) {
      if (font.valign !== undefined) value.textVerticalAlign = font.valign;
      else if (font.verticalAlign !== undefined) value.textVerticalAlign = font.verticalAlign;
    }
    delete font.align;
    delete font.valign;
    delete font.verticalAlign;
  }

  Object.values(value).forEach(normalizeSketchAliases);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quoted = false;
  let escaped = false;

  const push = () => {
    if (current.length === 0) return;
    tokens.push(current);
    current = '';
  };

  const pushQuoted = () => {
    tokens.push(`${quotedTokenPrefix}${current}`);
    current = '';
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (escaped) {
        if (char === 'n') current += '\n';
        else if (char === 'r') current += '\r';
        else if (char === 't') current += '\t';
        else current += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        quoted = false;
        pushQuoted();
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"') {
      push();
      quoted = true;
      continue;
    }

    if (char === '{' || char === '[') {
      push();
      const jsonToken = readJsonToken(input, index);
      if (jsonToken) {
        tokens.push(jsonToken.token);
        index = jsonToken.end;
        continue;
      }
    }

    if (/\s/.test(char)) {
      push();
      continue;
    }

    if (char === ':' && /^[A-Za-z_][\w-]*$/.test(current) && input[index + 1] !== '/') {
      push();
      tokens.push(':');
      continue;
    }

    current += char;
  }

  push();
  return tokens;
}

function readJsonToken(input: string, start: number): { token: string; end: number } | null {
  const opener = input[start];
  if (opener !== '{' && opener !== '[') return null;

  let depth = 0;
  let quoted = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (quoted) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') quoted = false;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === '{' || char === '[') {
      depth += 1;
      continue;
    }
    if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return { token: input.slice(start, index + 1), end: index };
    }
  }

  return null;
}
