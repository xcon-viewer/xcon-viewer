import { isXconObject } from '@xcon-viewer/core';
import {
  dataVizAliasTypes,
  type DataVizAliasType,
  type DataVizModel,
  type PlotMarkSpec,
  type PlotSpec,
} from './types';

type PlainRecord = Record<string, unknown>;

const plotMarkTypes = ['barY', 'barX', 'line', 'areaY', 'dot', 'ruleY', 'ruleX'] as const;
const plotMarkFields = ['x', 'y', 'fill', 'stroke'] as const;
const dataVizAliasSet = new Set<string>(dataVizAliasTypes);
const plotMarkTypeSet = new Set<string>(plotMarkTypes);
const unsafePlotStringPattern = /javascript:|vbscript:|expression\s*\(|url\s*\(/i;
const safeColorPattern = /^(?:#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})|[a-zA-Z]+|var\(\s*--[a-zA-Z0-9_-]+\s*\)|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;

export const advancedDataVizAliases = dataVizAliasTypes;

export function isDataVizAlias(value: unknown): value is DataVizAliasType {
  return typeof value === 'string' && dataVizAliasSet.has(value);
}

export function toDataVizPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const result: PlainRecord = {};
    value.forEach((child, key) => {
      result[key] = toDataVizPlainValue(child);
    });
    return result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toDataVizPlainValue(item));
  }

  if (isPlainRecord(value)) {
    const result: PlainRecord = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = toDataVizPlainValue(child);
    }
    return result;
  }

  return value;
}

export function normalizeDataVizComponent(input: unknown): DataVizModel {
  const component = asRecord(toDataVizPlainValue(input)) ?? {};
  const inputType = stringValue(component.type);
  const aliasType = isDataVizAlias(inputType) ? inputType : undefined;
  const vizType =
    aliasType ??
    stringValue(component.vizType) ??
    stringValue(component.variant) ??
    (inputType && inputType !== 'dataViz' ? inputType : 'bar');
  const model: DataVizModel = {
    type: 'dataViz',
    vizType,
    data: component.data === undefined || component.data === null ? [] : component.data,
    config: asRecord(component.config) ?? {},
    interactive: booleanValue(component.interactive) ?? true,
    allowPartial: booleanValue(component.allowPartial) ?? false,
  };

  if (aliasType) model.aliasType = aliasType;

  return model;
}

export function normalizePlotSpec(input: unknown): PlotSpec {
  const spec = asRecord(toDataVizPlainValue(input)) ?? {};

  return {
    data: arrayValue(spec.data).flatMap((row) => normalizePlotRow(row)),
    marks: arrayValue(spec.marks).flatMap((mark) => normalizePlotMark(mark)),
    options: normalizePlotOptions(spec.options),
  };
}

function normalizePlotRow(value: unknown): Array<Record<string, unknown>> {
  const row = asRecord(value);
  return row ? [sanitizeDeclarativeRecord(row)] : [];
}

function normalizePlotMark(value: unknown): PlotMarkSpec[] {
  const mark = asRecord(value);
  if (!mark) return [];

  const type = stringValue(mark.type);
  if (!isPlotMarkType(type)) return [];

  const output: PlotMarkSpec = { type };
  for (const field of plotMarkFields) {
    const fieldValue = markFieldStringValue(mark[field]);
    if (fieldValue !== undefined) output[field] = fieldValue;
  }

  return [output];
}

function normalizePlotOptions(value: unknown): Record<string, unknown> {
  const options = asRecord(value);
  if (!options) return {};

  const output: PlainRecord = {};
  if (typeof options.grid === 'boolean') output.grid = options.grid;
  for (const key of ['width', 'height', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const) {
    const number = nonNegativeFiniteNumber(options[key], key === 'width' || key === 'height');
    if (number !== undefined) output[key] = number;
  }
  const color = safePlotColor(options.color);
  if (color !== undefined) output.color = color;
  const x = normalizePlotScaleOptions(options.x);
  const y = normalizePlotScaleOptions(options.y);
  if (x) output.x = x;
  if (y) output.y = y;
  return output;
}

function sanitizeDeclarativeRecord(record: PlainRecord): PlainRecord {
  const output: PlainRecord = {};
  for (const [key, value] of Object.entries(record)) {
    const safeValue = sanitizeDeclarativeValue(value);
    if (safeValue !== undefined) output[key] = safeValue;
  }
  return output;
}

function sanitizeDeclarativeValue(value: unknown): unknown {
  if (typeof value === 'function' || value === undefined) return undefined;

  if (isXconObject(value)) {
    return sanitizeDeclarativeValue(toDataVizPlainValue(value));
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeclarativeValue(item)).filter((item) => item !== undefined);
  }

  if (isPlainRecord(value)) {
    return sanitizeDeclarativeRecord(value);
  }

  return value;
}

function normalizePlotScaleOptions(value: unknown): PlainRecord | undefined {
  const input = asRecord(value);
  if (!input) return undefined;
  const output: PlainRecord = {};
  const label = safePlotText(input.label);
  if (label !== undefined) output.label = label;
  if (typeof input.grid === 'boolean') output.grid = input.grid;
  if (typeof input.reverse === 'boolean') output.reverse = input.reverse;
  const domain = safePlotDomain(input.domain);
  if (domain !== undefined) output.domain = domain;
  return Object.keys(output).length > 0 ? output : undefined;
}

function safePlotDomain(value: unknown): Array<string | number | boolean | null> | undefined {
  if (!Array.isArray(value) || value.length > 64) return undefined;
  const domain: Array<string | number | boolean | null> = [];
  for (const item of value) {
    if (item === null || typeof item === 'number' || typeof item === 'boolean') {
      if (typeof item !== 'number' || Number.isFinite(item)) domain.push(item);
      continue;
    }
    const text = safePlotText(item);
    if (text === undefined) return undefined;
    domain.push(text);
  }
  return domain;
}

function safePlotText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || unsafePlotStringPattern.test(trimmed)) return undefined;
  return trimmed;
}

function safePlotColor(value: unknown): string | undefined {
  const color = safePlotText(value);
  if (!color) return undefined;
  return safeColorPattern.test(color) ? color : undefined;
}

function nonNegativeFiniteNumber(value: unknown, positive: boolean): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return positive ? (number > 0 ? number : undefined) : (number >= 0 ? number : undefined);
}

function isPlotMarkType(value: unknown): value is PlotMarkSpec['type'] {
  return typeof value === 'string' && plotMarkTypeSet.has(value);
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): PlainRecord | undefined {
  return isPlainRecord(value) ? value : undefined;
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isXconObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function markFieldStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return undefined;
}
