import { isXconObject, XconObject, type XconValue } from '../../model/index.js';
import { applyPropertyTypes, parseUnquotedPrimitive } from '../property-types.js';

export interface TaglessMarkers {
  markers?: string;
  endMarkers?: string;
  pretty?: boolean;
}

interface MarkerSet {
  open: string[];
  close: string[];
  prefix: string;
  suffix: string;
}

const defaultMarkers = '♤♡◇♧';
const defaultEndMarkers = '♠♥◆♣';

export function toTagless(value: XconValue | XconObject, options: TaglessMarkers = {}): string {
  const markerSet = createMarkerSet(options.markers ?? defaultMarkers, options.endMarkers ?? defaultEndMarkers);
  if (options.pretty) return `${markerSet.prefix}\n${writeValue(value, markerSet, 0, true)}\n${markerSet.suffix}`;
  return `${markerSet.prefix}${writeValue(value, markerSet, 0, false)}${markerSet.suffix}`;
}

export function fromTagless(text: string): XconObject {
  const trimmed = text.trim();
  if (trimmed.length < 8) throw new Error('TAGLESS input is too short.');
  const prefix = Array.from(trimmed.slice(0, 8)).slice(0, 4).join('');
  const suffix = Array.from(trimmed).slice(-4).join('');
  const markerSet = createMarkerSet(prefix, suffix);
  const body = trimmed.slice(prefix.length, trimmed.length - suffix.length);
  const cursor = { index: 0 };
  const value = readValue(body, cursor, markerSet);
  if (!isXconObject(value)) throw new Error('TAGLESS root must be a dictionary.');
  return applyPropertyTypes(value);
}

function createMarkerSet(markers: string, endMarkers: string): MarkerSet {
  const open = Array.from(markers);
  const close = Array.from(endMarkers);
  if (open.length !== 4 || close.length !== 4) {
    throw new Error('TAGLESS markers and endMarkers must each contain exactly 4 characters.');
  }
  if (new Set(open).size !== 4 || new Set(close).size !== 4) {
    throw new Error('TAGLESS markers must be unique.');
  }
  if ([...open, ...close].some((marker) => /\s|\p{Cc}|%/u.test(marker))) {
    throw new Error('TAGLESS markers cannot contain whitespace, percent signs, or control characters.');
  }
  return { open, close, prefix: open.join(''), suffix: close.join('') };
}

function writeValue(value: XconValue | XconObject, markerSet: MarkerSet, depth: number, pretty: boolean): string {
  const { open, close } = markerSet;
  const indent = pretty ? '  '.repeat(depth) : '';
  const childIndent = pretty ? '  '.repeat(depth + 1) : '';
  if (isXconObject(value)) {
    if (!pretty) {
      return `${open[0]}${value
        .map((item, key) => `${open[3]}${encodePayload(key, markerSet, true)}${close[3]}${writeValue(item, markerSet, depth + 1, false)}`)
        .join('')}${close[0]}`;
    }
    const body = value
      .map((item, key) => {
        const keyPart = `${childIndent}${open[3]}${encodePayload(key, markerSet, true)}${close[3]}`;
        const rendered = writeValue(item, markerSet, depth + 1, true);
        return isXconObject(item) || Array.isArray(item) ? `${keyPart}\n${rendered}` : `${keyPart}${rendered.trimStart()}`;
      })
      .join('\n');
    return `${indent}${open[0]}${body ? `\n${body}\n${indent}` : ''}${close[0]}`;
  }
  if (Array.isArray(value)) {
    if (!pretty) return `${open[1]}${value.map((item) => writeValue(item, markerSet, depth + 1, false)).join('')}${close[1]}`;
    const body = value.map((item) => writeValue(item, markerSet, depth + 1, true)).join('\n');
    return `${indent}${open[1]}${body ? `\n${body}\n${indent}` : ''}${close[1]}`;
  }
  return `${indent}${open[2]}${encodePayload(formatPrimitive(value), markerSet, true)}${close[2]}`;
}

function readValue(text: string, cursor: { index: number }, markerSet: MarkerSet): XconValue {
  skipWhitespace(text, cursor);
  const { open, close } = markerSet;
  const marker = text[cursor.index];
  if (marker === open[0]) return readObject(text, cursor, markerSet);
  if (marker === open[1]) return readArray(text, cursor, markerSet);
  if (marker === open[2]) return readPrimitive(text, cursor, markerSet);
  throw new Error(`Unexpected TAGLESS marker at ${cursor.index}: ${marker || '<eof>'}`);
}

function readObject(text: string, cursor: { index: number }, markerSet: MarkerSet): XconObject {
  const { open, close } = markerSet;
  const output = new XconObject();
  cursor.index += open[0].length;

  while (cursor.index < text.length && text[cursor.index] !== close[0]) {
    skipWhitespace(text, cursor);
    if (text[cursor.index] === close[0]) break;
    expect(text, cursor, open[3]);
    const key = readUntil(text, cursor, close[3]);
    const value = readValue(text, cursor, markerSet);
    if (!output.contains(key)) output.add(key, value);
  }

  expect(text, cursor, close[0]);
  return output;
}

function readArray(text: string, cursor: { index: number }, markerSet: MarkerSet): XconValue[] {
  const { open, close } = markerSet;
  const output: XconValue[] = [];
  cursor.index += open[1].length;

  while (cursor.index < text.length && text[cursor.index] !== close[1]) {
    skipWhitespace(text, cursor);
    if (text[cursor.index] === close[1]) break;
    output.push(readValue(text, cursor, markerSet));
  }

  expect(text, cursor, close[1]);
  return output;
}

function readPrimitive(text: string, cursor: { index: number }, markerSet: MarkerSet): XconValue {
  const { open, close } = markerSet;
  cursor.index += open[2].length;
  const raw = readUntil(text, cursor, close[2]);
  return parseUnquotedPrimitive(raw);
}

function expect(text: string, cursor: { index: number }, marker: string): void {
  skipWhitespace(text, cursor);
  if (text[cursor.index] !== marker) {
    throw new Error(`Expected TAGLESS marker "${marker}" at ${cursor.index}.`);
  }
  cursor.index += marker.length;
}

function readUntil(text: string, cursor: { index: number }, marker: string): string {
  const end = text.indexOf(marker, cursor.index);
  if (end < 0) throw new Error(`Unclosed TAGLESS marker "${marker}".`);
  const value = text.slice(cursor.index, end);
  cursor.index = end + marker.length;
  return decodePayload(value);
}

function encodePayload(value: string, markerSet: MarkerSet, readable = false): string {
  let encoded = readable ? value.replaceAll('%', '%25') : encodeURIComponent(value);
  for (const marker of new Set([...markerSet.open, ...markerSet.close])) {
    encoded = encoded.replaceAll(marker, percentEncodeMarker(marker));
  }
  return encoded;
}

function decodePayload(value: string): string {
  return decodeURIComponent(value);
}

function percentEncodeMarker(marker: string): string {
  const encoded = encodeURIComponent(marker);
  if (encoded !== marker) return encoded;
  const codePoint = marker.codePointAt(0);
  if (codePoint === undefined) return marker;
  return `%${codePoint.toString(16).toUpperCase().padStart(2, '0')}`;
}

function formatPrimitive(value: XconValue): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function skipWhitespace(text: string, cursor: { index: number }): void {
  while (cursor.index < text.length && /\s/.test(text[cursor.index])) cursor.index += 1;
}
