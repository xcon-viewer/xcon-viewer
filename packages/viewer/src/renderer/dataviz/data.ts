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
  return options ? sanitizeDeclarativeRecord(options) : {};
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
