export type XconName = string;
export type XconPrimitive = string | number | boolean | null;
export type XconValue = XconPrimitive | XconArray | XconObject;
export type XconArray = XconValue[];
export type XconProps = Record<string, XconValue>;
export type XconDocument = XconObject;
export type XconComponent = XconObject;

export class XconObject implements Iterable<[XconName, XconValue]> {
  private readonly names: XconName[] = [];
  private readonly values: XconValue[] = [];
  private readonly indexes = new Map<XconName, number>();

  constructor(initial?: Record<string, unknown> | Iterable<[string, unknown]>) {
    if (!initial) return;

    if (Symbol.iterator in Object(initial) && !isPlainObject(initial)) {
      for (const [name, value] of initial as Iterable<[string, unknown]>) {
        this.add(name, toXconValue(value));
      }
      return;
    }

    for (const [name, value] of Object.entries(initial as Record<string, unknown>)) {
      this.add(name, toXconValue(value));
    }
  }

  get count(): number {
    return this.names.length;
  }

  add(name: XconName, value: unknown): this {
    if (this.contains(name)) return this.set(name, value);
    this.indexes.set(name, this.names.length);
    this.names.push(name);
    this.values.push(toXconValue(value));
    return this;
  }

  set(name: XconName, value: unknown): this {
    const index = this.indexOf(name);
    if (index < 0) return this.add(name, value);
    this.values[index] = toXconValue(value);
    return this;
  }

  insert(index: number, name: XconName, value: unknown): this {
    if (this.contains(name)) this.remove(name);
    const nextIndex = Math.max(0, Math.min(index, this.names.length));
    this.names.splice(nextIndex, 0, name);
    this.values.splice(nextIndex, 0, toXconValue(value));
    this.reindex();
    return this;
  }

  get<T extends XconValue = XconValue>(name: XconName, defaultValue?: T): T {
    const index = this.indexOf(name);
    if (index < 0) return defaultValue as T;
    return this.values[index] as T;
  }

  getKey(index: number): XconName | undefined {
    return this.names[index];
  }

  getValue<T extends XconValue = XconValue>(index: number): T | undefined {
    return this.values[index] as T | undefined;
  }

  getString(name: XconName, defaultValue = ''): string {
    const value = this.get(name);
    return value === undefined || value === null ? defaultValue : String(value);
  }

  contains(name: XconName): boolean {
    return this.indexes.has(name);
  }

  indexOf(name: XconName): number {
    return this.indexes.get(name) ?? -1;
  }

  remove(name: XconName): boolean {
    const index = this.indexOf(name);
    if (index < 0) return false;
    this.removeAt(index);
    return true;
  }

  removeAt(index: number): boolean {
    if (index < 0 || index >= this.names.length) return false;
    this.names.splice(index, 1);
    this.values.splice(index, 1);
    this.reindex();
    return true;
  }

  clear(): void {
    this.names.length = 0;
    this.values.length = 0;
    this.indexes.clear();
  }

  forEach(callback: (value: XconValue, name: XconName, index: number) => void): void {
    this.names.forEach((name, index) => callback(this.values[index], name, index));
  }

  map<T>(callback: (value: XconValue, name: XconName, index: number) => T): T[] {
    return this.names.map((name, index) => callback(this.values[index], name, index));
  }

  filter(callback: (value: XconValue, name: XconName, index: number) => boolean): XconObject {
    const next = new XconObject();
    this.forEach((value, name, index) => {
      if (callback(value, name, index)) next.add(name, cloneXconValue(value, true));
    });
    return next;
  }

  reduce<T>(
    callback: (accumulator: T, value: XconValue, name: XconName, index: number) => T,
    initialValue: T,
  ): T {
    let accumulator = initialValue;
    this.forEach((value, name, index) => {
      accumulator = callback(accumulator, value, name, index);
    });
    return accumulator;
  }

  some(callback: (value: XconValue, name: XconName, index: number) => boolean): boolean {
    return this.names.some((name, index) => callback(this.values[index], name, index));
  }

  every(callback: (value: XconValue, name: XconName, index: number) => boolean): boolean {
    return this.names.every((name, index) => callback(this.values[index], name, index));
  }

  clone(): XconObject {
    return new XconObject(this);
  }

  deepClone(): XconObject {
    const next = new XconObject();
    this.forEach((value, name) => next.add(name, cloneXconValue(value, true)));
    return next;
  }

  copy(source: XconObject | Record<string, unknown>): this {
    this.clear();
    const next = isXconObject(source) ? source : new XconObject(source);
    next.forEach((value, name) => this.add(name, cloneXconValue(value, true)));
    return this;
  }

  entries(): Array<[XconName, XconValue]> {
    return this.names.map((name, index) => [name, this.values[index]]);
  }

  keys(): XconName[] {
    return [...this.names];
  }

  [Symbol.iterator](): Iterator<[XconName, XconValue]> {
    return this.entries()[Symbol.iterator]();
  }

  private reindex(): void {
    this.indexes.clear();
    this.names.forEach((name, index) => this.indexes.set(name, index));
  }
}

export function isXconObject(value: unknown): value is XconObject {
  return (
    value instanceof XconObject ||
    (!!value &&
      typeof value === 'object' &&
      typeof (value as { get?: unknown }).get === 'function' &&
      typeof (value as { set?: unknown }).set === 'function' &&
      typeof (value as { contains?: unknown }).contains === 'function')
  );
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  if (isXconObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function toXconValue(value: unknown): XconValue {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (isXconObject(value)) return value;
  if (Array.isArray(value)) return value.map((item) => toXconValue(item));
  if (isPlainObject(value)) return new XconObject(value);
  return String(value);
}

export function cloneXconValue<T extends XconValue>(value: T, deep = false): T {
  if (!deep) return value;
  if (isXconObject(value)) return value.deepClone() as T;
  if (Array.isArray(value)) return value.map((item) => cloneXconValue(item, true)) as T;
  return value;
}

export function normalize(value: unknown): unknown {
  if (isXconObject(value)) {
    const output: Record<string, unknown> = {};
    value.forEach((item, name) => {
      output[name] = normalize(item);
    });
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value === undefined) return null;
  return value;
}

export function getByPath(root: unknown, path: string): XconValue | undefined {
  const segments = path.split('.').filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    const arrayMatch = segment.match(/^_items\((\d+)\)$/);
    if (arrayMatch) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(arrayMatch[1])];
      continue;
    }

    if (isXconObject(current)) {
      current = current.get(segment);
      continue;
    }

    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      current = current[Number(segment)];
      continue;
    }

    if (isPlainObject(current)) {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return toXconValue(current);
}

export function getAllPaths(root: unknown): string[] {
  const paths: string[] = [];
  collectPaths(root, '', paths);
  return paths;
}

export function printDict(root: unknown, indent = 0): string {
  const lines: string[] = [];
  writeDebugValue(root, indent, lines);
  return lines.join('\n');
}

function collectPaths(value: unknown, base: string, paths: string[]): void {
  if (isXconObject(value)) {
    value.forEach((child, key) => {
      const path = base ? `${base}.${key}` : key;
      paths.push(path);
      collectPaths(child, path, paths);
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      const path = base ? `${base}._items(${index})` : `_items(${index})`;
      paths.push(path);
      collectPaths(child, path, paths);
    });
  }
}

function writeDebugValue(value: unknown, indent: number, lines: string[], label?: string): void {
  const prefix = ' '.repeat(indent);
  const keyPrefix = label ? `${label}: ` : '';

  if (isXconObject(value)) {
    if (label) lines.push(`${prefix}${label}:`);
    value.forEach((child, key) => writeDebugValue(child, label ? indent + 2 : indent, lines, key));
    return;
  }

  if (Array.isArray(value)) {
    if (label) lines.push(`${prefix}${label}:`);
    value.forEach((child, index) => writeDebugValue(child, label ? indent + 2 : indent, lines, `_items(${index})`));
    return;
  }

  lines.push(`${prefix}${keyPrefix}${String(value)}`);
}
