import { isXconObject, normalize, XconObject, type XconValue } from '../../model/index.js';
import { parseAttributeByPropertySpec } from '../property-types.js';

export type XmlSyntaxKind = 'machine' | 'semantic';

export interface XmlSerializeOptions {
  format?: XmlSyntaxKind;
  pretty?: boolean;
}

type XmlChild = XmlNode | string;

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlChild[];
}

const semanticTypeAliases: Record<string, string> = {
  XCON: 'xcon',
  Form: 'form',
  List: 'list',
  XList: 'list',
  Label: 'label',
  Text: 'label',
  TextField: 'textField',
  TextView: 'textView',
  Button: 'button',
  Panel: 'panel',
  Checkbox: 'checkbox',
  RadioButton: 'radioButton',
  Image: 'image',
  VideoView: 'videoView',
  Banner: 'banner',
  Shape: 'shape',
  Stack: 'stack',
  FlexBox: 'flexBox',
  Grid: 'grid',
  Card: 'card',
};

const semanticTags: Record<string, string> = {
  form: 'Form',
  list: 'List',
  label: 'Label',
  textField: 'TextField',
  textView: 'TextView',
  button: 'Button',
  panel: 'Panel',
  checkbox: 'Checkbox',
  radioButton: 'RadioButton',
  image: 'Image',
  videoView: 'VideoView',
  banner: 'Banner',
  shape: 'Shape',
  passwordField: 'PasswordField',
  textarea: 'Textarea',
  select: 'Select',
  slider: 'Slider',
  switch: 'Switch',
  colorPicker: 'ColorPicker',
  datePicker: 'DatePicker',
  timePicker: 'TimePicker',
  rating: 'Rating',
  progressBar: 'ProgressBar',
  spinner: 'Spinner',
  badge: 'Badge',
  avatar: 'Avatar',
  icon: 'Icon',
  divider: 'Divider',
  alert: 'Alert',
  tooltip: 'Tooltip',
  modal: 'Modal',
  tabs: 'Tabs',
  accordion: 'Accordion',
  grid: 'Grid',
  flexBox: 'FlexBox',
  stack: 'Stack',
  spacer: 'Spacer',
  card: 'Card',
  searchBar: 'SearchBar',
  treeView: 'TreeView',
  carousel: 'Carousel',
  gallery: 'Gallery',
  qrCode: 'QrCode',
  barcode: 'Barcode',
};

export function fromXml(xmlString: string): XconObject {
  const document = parseXml(xmlString);
  const root = firstElement(document);
  if (!root) throw new Error('XML document is empty.');

  if (isMachineWrapper(root)) {
    const child = firstElement(root);
    if (!child) throw new Error('XCON XML wrapper does not contain a value.');
    return requireObject(parseMachineValue(child));
  }

  if (isMachineValueNode(root)) return requireObject(parseMachineValue(root));
  return parseSemanticComponent(root);
}

export function detectXmlSyntax(xmlString: string): XmlSyntaxKind {
  const document = parseXml(xmlString);
  const root = firstElement(document);
  if (!root) throw new Error('XML document is empty.');
  return isMachineWrapper(root) || isMachineValueNode(root) ? 'machine' : 'semantic';
}

export function toXml(value: XconValue | XconObject, options: XmlSerializeOptions = {}): string {
  const format = options.format ?? 'semantic';
  if (format === 'semantic') return serializeSemanticComponent(requireObject(value as XconValue), '', undefined, options.pretty ?? true);
  return `<xcon>${serializeMachineValue(value)}</xcon>`;
}

function requireObject(value: XconValue): XconObject {
  if (!isXconObject(value)) throw new Error('XCON XML root must be an object.');
  return value;
}

function parseXml(input: string): XmlNode {
  const root: XmlNode = { name: '#document', attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  const tokenPattern = /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:\s+[^<>]*?)?\/?>|[^<]+/g;
  const tokens = input.match(tokenPattern) ?? [];

  for (const token of tokens) {
    if (!token || token.startsWith('<?') || token.startsWith('<!--')) continue;

    if (token.startsWith('<![CDATA[')) {
      current(stack).children.push(token.slice(9, -3));
      continue;
    }

    if (token.startsWith('</')) {
      const name = token.slice(2, -1).trim();
      const node = stack.pop();
      if (!node || node.name !== name) throw new Error(`Mismatched XML closing tag: ${name}`);
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const body = token.slice(1, selfClosing ? -2 : -1).trim();
      const [name = ''] = body.split(/\s+/, 1);
      const attrs = parseAttributes(body.slice(name.length));
      const node: XmlNode = { name, attrs, children: [] };
      current(stack).children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }

    if (token.trim()) current(stack).children.push(decodeXml(token));
  }

  if (stack.length !== 1) throw new Error(`Unclosed XML tag: ${current(stack).name}`);
  return root;
}

function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(input))) {
    attrs[match[1]] = decodeXml(match[2] ?? match[3] ?? '');
  }
  return attrs;
}

function current(stack: XmlNode[]): XmlNode {
  return stack[stack.length - 1];
}

function firstElement(node: XmlNode): XmlNode | null {
  return (node.children.find((child): child is XmlNode => typeof child !== 'string') ?? null);
}

function elementChildren(node: XmlNode): XmlNode[] {
  return node.children.filter((child): child is XmlNode => typeof child !== 'string');
}

function textContent(node: XmlNode): string {
  return node.children
    .filter((child): child is string => typeof child === 'string')
    .join('')
    .trim();
}

function isMachineWrapper(node: XmlNode): boolean {
  return node.name.toLowerCase() === 'xcon' && !!firstElement(node) && isMachineValueNode(firstElement(node)!);
}

function isMachineValueNode(node: XmlNode): boolean {
  return ['x', 'c', 'o', 'int', 'double', 'number', 'bool', 'datetime', 'null'].includes(
    node.name.toLowerCase(),
  );
}

function parseMachineValue(node: XmlNode): XconValue {
  const name = node.name.toLowerCase();
  if (name === 'x') return parseMachineObject(node);
  if (name === 'c') return elementChildren(node).map((child) => parseMachineValue(child));
  if (name === 'int') return Number.parseInt(textContent(node), 10);
  if (name === 'double' || name === 'number') return Number(textContent(node));
  if (name === 'bool') return textContent(node).toLowerCase() === 'true';
  if (name === 'null') return null;
  return textContent(node);
}

function parseMachineObject(node: XmlNode): XconObject {
  const output = new XconObject();
  const children = elementChildren(node);

  for (let index = 0; index < children.length; index += 1) {
    const keyNode = children[index];
    if (keyNode.name.toLowerCase() !== 'n') continue;
    const key = textContent(keyNode);
    const valueNode = children[index + 1];
    if (!key || !valueNode) continue;
    if (!output.contains(key)) output.add(key, parseMachineValue(valueNode));
    index += 1;
  }

  return output;
}

function parseSemanticComponent(node: XmlNode, stripStructuralName = false): XconObject {
  const output = new XconObject();
  const type = toPublicType(node.name);
  output.add('type', type);

  const metadata = new XconObject();
  for (const [name, rawValue] of Object.entries(node.attrs)) {
    if (stripStructuralName && name === 'name') continue;
    if (name.startsWith('xcon-prop-')) {
      output.add(name.slice(10), parseAttributeByPropertySpec(name.slice(10), rawValue, type));
      continue;
    }
    if (name.includes(':')) {
      metadata.add(name, parseAttributeByPropertySpec(name, rawValue, type));
    } else {
      output.add(name, parseAttributeByPropertySpec(name, rawValue, type));
    }
  }
  if (metadata.count > 0) output.add('metadata', metadata);

  const text = textContent(node);
  if (text && !output.contains('text')) output.add('text', text);

  const childElements = elementChildren(node);
  const arrayChildren = childElements.filter(isSemanticArrayWrapper);
  arrayChildren.forEach((child) => {
    output.set(toArrayPropertyName(child.name), parseSemanticArray(child));
  });

  const componentChildren = childElements.filter((child) => !isSemanticArrayWrapper(child));
  if (componentChildren.length > 0) {
    const components = new XconObject();
    componentChildren.forEach((child, index) => {
      const structuralName = child.attrs.name;
      const component = parseSemanticComponent(child, typeof structuralName === 'string' && !!structuralName);
      const id = component.get('id');
      const key =
        typeof id === 'string' && id
          ? id
          : typeof structuralName === 'string' && structuralName
            ? structuralName
            : `${component.getString('type', 'component')}${index + 1}`;
      components.add(key, component);
    });
    if (output.contains('componentsOrder')) {
      components.add('componentsOrder', output.get('componentsOrder'));
      output.remove('componentsOrder');
    }
    output.add('components', components);
  }

  return output;
}

function isSemanticArrayWrapper(node: XmlNode): boolean {
  return ['items', 'slides'].includes(node.name.toLowerCase());
}

function toArrayPropertyName(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized === 'items') return 'items';
  return 'slides';
}

function parseSemanticArray(node: XmlNode): XconValue[] {
  return elementChildren(node).map((child) => {
    if (child.name === 'Value') {
      const raw = child.attrs.json ?? textContent(child);
      try {
        return jsonValueToXcon(JSON.parse(raw));
      } catch {
        return parseAttributeValue(raw);
      }
    }
    return parseSemanticComponent(child, child.attrs.name !== undefined);
  });
}

function toPublicType(name: string): string {
  return semanticTypeAliases[name] ?? name.charAt(0).toLowerCase() + name.slice(1);
}

function parseAttributeValue(value: string): XconValue {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return jsonValueToXcon(parsed);
    } catch {
      return value;
    }
  }
  return value;
}

function jsonValueToXcon(value: unknown): XconValue {
  if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value ?? null;
  }
  if (Array.isArray(value)) return value.map((item) => jsonValueToXcon(item));
  if (typeof value === 'object') return new XconObject(value as Record<string, unknown>);
  return String(value);
}

function serializeMachineValue(value: XconValue | XconObject): string {
  if (isXconObject(value)) {
    return `<x>${value.map((item, key) => `<n>${encodeXml(key)}</n>${serializeMachineValue(item)}`).join('')}</x>`;
  }
  if (Array.isArray(value)) return `<c>${value.map((item) => serializeMachineValue(item)).join('')}</c>`;
  if (value === null) return '<null />';
  if (typeof value === 'boolean') return `<bool>${value}</bool>`;
  if (typeof value === 'number') return Number.isInteger(value) ? `<int>${value}</int>` : `<double>${value}</double>`;
  return `<o>${encodeXml(value)}</o>`;
}

function serializeSemanticComponent(
  component: XconObject,
  indent: string,
  componentName: string | undefined,
  pretty: boolean,
): string {
  const type = component.getString('type', 'panel');
  const tagName = toSemanticTag(type);
  const attrs: string[] = [];
  const children: string[] = [];
  const childIndent = pretty ? `${indent}  ` : '';

  if (componentName) attrs.push(`name="${encodeXml(componentName)}"`);

  component.forEach((value, key) => {
    if (key === 'type') return;
    if (componentName && key === 'name') {
      attrs.push(`xcon-prop-name="${encodeXml(formatSemanticAttribute('name', value))}"`);
      return;
    }

    if (key === 'components' && isXconObject(value)) {
      const order = value.get('componentsOrder');
      if (typeof order === 'string' && order) attrs.push(`componentsOrder="${encodeXml(order)}"`);
      value.forEach((child, childKey) => {
        if (childKey === 'componentsOrder' || !isXconObject(child)) return;
        children.push(serializeSemanticComponent(child, childIndent, childKey, pretty));
      });
      return;
    }

    if ((key === 'items' || key === 'slides') && Array.isArray(value)) {
      children.push(serializeSemanticArray(key, value, childIndent, pretty));
      return;
    }

    if (key === 'metadata' && isXconObject(value)) {
      value.forEach((metadataValue, metadataKey) => {
        attrs.push(`${metadataKey}="${encodeXml(formatSemanticAttribute(metadataKey, metadataValue))}"`);
      });
      return;
    }

    attrs.push(`${key}="${encodeXml(formatSemanticAttribute(key, value))}"`);
  });

  const open = `${indent}<${tagName}${attrs.length ? ` ${attrs.join(' ')}` : ''}`;
  if (children.length === 0) return `${open} />`;
  const separator = pretty ? '\n' : '';
  return `${open}>${separator}${children.join(separator)}${separator}${indent}</${tagName}>`;
}

function serializeSemanticArray(key: string, value: XconValue[], indent: string, pretty: boolean): string {
  const tagName = key === 'items' ? 'Items' : 'Slides';
  const childIndent = pretty ? `${indent}  ` : '';
  const children = value.map((item) => {
    if (isXconObject(item) && typeof item.get('type') === 'string') {
      return serializeSemanticComponent(item, childIndent, undefined, pretty);
    }
    return `${childIndent}<Value json="${encodeXml(JSON.stringify(normalize(item)))}" />`;
  });
  const separator = pretty ? '\n' : '';
  if (children.length === 0) return `${indent}<${tagName} />`;
  return `${indent}<${tagName}>${separator}${children.join(separator)}${separator}${indent}</${tagName}>`;
}

function toSemanticTag(type: string): string {
  return semanticTags[type] ?? `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function formatSemanticAttribute(key: string, value: XconValue): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isCompactNumberArrayAttribute(key, value)) return value.join(',');
  if (isXconObject(value)) {
    const compactObject = formatSemanticObjectAttribute(value);
    if (compactObject) return compactObject;
  }
  return JSON.stringify(normalize(value));
}

function isCompactNumberArrayAttribute(key: string, value: XconValue): value is number[] {
  return ['pos', 'contentSize', 'offset'].includes(key) && Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

function formatSemanticObjectAttribute(object: XconObject): string | null {
  const parts: string[] = [];
  let supported = true;
  object.forEach((item, key) => {
    if (!supported) return;
    if (item === null || Array.isArray(item) || isXconObject(item)) {
      supported = false;
      return;
    }

    const rawValue = String(item);
    if (/[\r\n;]/.test(rawValue)) {
      supported = false;
      return;
    }
    parts.push(`${key}:${rawValue}`);
  });

  return supported && parts.length > 0 ? parts.join('; ') : null;
}

function encodeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
