import { fromJSON, toJSON } from '../parser/json/index.js';
import { fromSketch, toSketch } from '../parser/sketch/index.js';
import { fromTagless, toTagless } from '../parser/tagless/index.js';
import { fromXml, toXml } from '../parser/xml/index.js';
import type { XconObject } from '../model/index.js';

export type XconSyntax = 'json' | 'xml' | 'tagless' | 'sketch';

export function parseBySyntax(input: string, syntax: XconSyntax): XconObject {
  if (syntax === 'json') return fromJSON(input);
  if (syntax === 'xml') return fromXml(input);
  if (syntax === 'sketch') return fromSketch(input);
  return fromTagless(input);
}

export function serializeBySyntax(input: XconObject, syntax: XconSyntax, pretty = true): string {
  if (syntax === 'json') return toJSON(input, pretty);
  if (syntax === 'xml') return toXml(input, { format: 'semantic', pretty });
  if (syntax === 'tagless') return toTagless(input, { pretty });
  return toSketch(input, { pretty });
}

export function convert(input: string, from: XconSyntax, to: XconSyntax): string {
  return serializeBySyntax(parseBySyntax(input, from), to, true);
}

export function detectXconSyntax(input: string): XconSyntax {
  const trimmed = input.trim();
  if (trimmed.startsWith('<')) return 'xml';
  if (trimmed.startsWith('{')) return 'json';
  if (looksLikeSketch(trimmed)) return 'sketch';
  return 'tagless';
}

export function deserialize(input: string): XconObject {
  const trimmed = input.trim();
  const syntax = detectXconSyntax(trimmed);
  if (syntax === 'xml') return fromXml(trimmed);
  if (syntax === 'json') return fromJSON(trimmed);
  if (syntax === 'sketch') return fromSketch(trimmed);

  try {
    return fromTagless(trimmed);
  } catch (taglessError) {
    try {
      return fromJSON(trimmed);
    } catch {
      throw taglessError;
    }
  }
}

function looksLikeSketch(source: string): boolean {
  const firstLine = source.split(/\r?\n/).find((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('//');
  })?.trim() ?? '';

  return (
    firstLine.startsWith('screen ') ||
    /^[A-Za-z_][\w-]*\s*:\s*[A-Za-z_][\w-]*(?:\s+"(?:[^"\\]|\\.)*")?\s+at\s+/.test(firstLine)
  );
}
