import { isXconObject, normalize, toXconValue, XconObject, type XconValue } from '../../model/index.js';
import { applyPropertyTypes } from '../property-types.js';

export function fromJSON(input: string | object): XconObject {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  return fromJSONObject(parsed);
}

export function fromJSONObject(input: unknown): XconObject {
  const value = toXconValue(input);
  if (!isXconObject(value)) {
    throw new TypeError('XCON/JSON root must be an object.');
  }
  return applyPropertyTypes(value);
}

export function toJSONObject(input: XconObject | XconValue): unknown {
  return normalize(input);
}

export function toJSON(input: XconObject | XconValue, pretty = false): string {
  return JSON.stringify(toJSONObject(input), null, pretty ? 2 : 0);
}

export function prettyJson(input: string): string {
  return JSON.stringify(JSON.parse(input), null, 2);
}
