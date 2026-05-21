import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

import {
  parseBySyntax,
  printValidationResult,
  serializeBySyntax,
  validate,
  type XconObject,
  type XconSyntax,
} from '@xcon-viewer/core';

export type XconOutputSyntax = Exclude<XconSyntax, 'sketch'>;

export interface CommandResult {
  exitCode: number;
  output: string;
  error?: string;
}

export interface OutputOptions {
  out?: string;
}

export async function readXconFile(file: string): Promise<{ source: string; syntax: XconSyntax; document: XconObject }> {
  const source = await readFile(file, 'utf8');
  const syntax = detectSyntax(file, source);
  return { source, syntax, document: parseBySyntax(source, syntax) };
}

export function detectSyntax(file: string, source: string): XconSyntax {
  const lower = file.toLowerCase();
  const extension = extname(file).toLowerCase();
  if (lower.endsWith('.xcon.sketch') || lower.endsWith('.xcons')) return 'sketch';
  if (extension === '.xml') return 'xml';
  if (extension === '.json') return 'json';
  const trimmed = source.trim();
  if (trimmed.startsWith('<')) return 'xml';
  if (trimmed.startsWith('{')) return 'json';
  if (looksLikeSketch(trimmed)) return 'sketch';
  return 'tagless';
}

export async function maybeWriteOutput(output: string, options: OutputOptions = {}): Promise<void> {
  if (options.out) await writeFile(options.out, output, 'utf8');
}

export function validationResult(document: XconObject): CommandResult {
  const result = validate(document);
  return {
    exitCode: result.valid ? 0 : 1,
    output: printValidationResult(result),
  };
}

export function serialize(document: XconObject, syntax: XconSyntax): string {
  return serializeBySyntax(document, syntax, true);
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
