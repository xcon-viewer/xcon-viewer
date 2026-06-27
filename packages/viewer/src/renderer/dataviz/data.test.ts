import { describe, expect, test } from 'vitest';
import { XconObject } from '@xcon-viewer/core';
import {
  advancedDataVizAliases,
  normalizeDataVizComponent,
  normalizePlotSpec,
  toDataVizPlainValue,
} from './data';

describe('dataViz normalization', () => {
  test('normalizes aliases to dataViz with a canonical vizType', () => {
    const model = normalizeDataVizComponent(
      new XconObject({
        type: 'sankey',
        data: {
          nodes: [{ id: 'in' }, { id: 'out' }],
          links: [{ source: 'in', target: 'out', value: 12 }],
        },
      }),
    );

    expect(model.type).toBe('dataViz');
    expect(model.vizType).toBe('sankey');
    expect(model.aliasType).toBe('sankey');
    expect(model.interactive).toBe(true);
    expect(model.allowPartial).toBe(false);
    expect(model.config).toEqual({});
  });

  test('keeps canonical dataViz vizType and converts XconObject data recursively', () => {
    const model = normalizeDataVizComponent(
      new XconObject({
        type: 'dataViz',
        vizType: 'treemap',
        data: new XconObject({
          name: 'Workspace',
          children: [new XconObject({ name: 'Viewer', value: 42 })],
        }),
        config: new XconObject({ theme: 'dark' }),
        interactive: false,
      }),
    );

    expect(model.type).toBe('dataViz');
    expect(model.vizType).toBe('treemap');
    expect(model.aliasType).toBeUndefined();
    expect(model.data).toEqual({ name: 'Workspace', children: [{ name: 'Viewer', value: 42 }] });
    expect(model.config).toEqual({ theme: 'dark' });
    expect(model.interactive).toBe(false);
  });

  test('uses variant as vizType fallback and parses conservative booleans', () => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      variant: 'sunburst',
      interactive: 'false',
      allowPartial: 1,
      config: 'unsafe',
    });

    expect(model.vizType).toBe('sunburst');
    expect(model.interactive).toBe(false);
    expect(model.allowPartial).toBe(true);
    expect(model.data).toEqual([]);
    expect(model.config).toEqual({});
  });

  test('ignores non-boolean-like values when applying boolean defaults', () => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'plot',
      interactive: 'yes',
      allowPartial: 2,
    });

    expect(model.interactive).toBe(true);
    expect(model.allowPartial).toBe(false);
  });

  test('sanitizes Observable Plot specs to a declarative mark allow-list', () => {
    const plot = normalizePlotSpec({
      data: [{ day: 'Mon', value: 12 }],
      marks: [
        { type: 'barY', x: 'day', y: 'value', fill: 'day', title: () => 'unsafe' },
        { type: 'customFunction', x: 'day', y: 'value' },
      ],
      options: { grid: true, tickFormat: () => 'unsafe' },
    });

    expect(plot.marks).toEqual([{ type: 'barY', x: 'day', y: 'value', fill: 'day' }]);
    expect(plot.options).toEqual({ grid: true });
  });

  test('drops unsafe Plot style and color or range-like option values', () => {
    const plot = normalizePlotSpec({
      data: [{ day: 'Mon', value: 12 }],
      marks: [{ type: 'barY', x: 'day', y: 'value' }],
      options: {
        grid: true,
        width: 420,
        height: 240,
        marginLeft: 48,
        style: 'background:url(javascript:alert(1))',
        color: 'url(javascript:alert(1))',
        range: ['#2563eb', 'url(javascript:alert(1))'],
        x: {
          label: 'Day',
          domain: ['Mon', 'Tue'],
          range: ['#fff', 'url(javascript:alert(1))'],
          style: 'background:url(https://example.com/bad.png)',
        },
        y: {
          label: 'Value',
          domain: [0, 20],
          tickFormat: () => 'unsafe',
        },
      },
    });

    expect(plot.options).toEqual({
      grid: true,
      width: 420,
      height: 240,
      marginLeft: 48,
      x: { label: 'Day', domain: ['Mon', 'Tue'] },
      y: { label: 'Value', domain: [0, 20] },
    });
  });

  test('preserves safe primitive Plot options and safe color strings', () => {
    const plot = normalizePlotSpec({
      data: [{ day: 'Mon', value: 12 }],
      marks: [{ type: 'barY', x: 'day', y: 'value' }],
      options: {
        grid: false,
        margin: 24,
        color: 'steelblue',
        x: { label: 'Day', domain: ['Mon', 'Tue'] },
        y: { label: 'Value', domain: [0, 20] },
      },
    });

    expect(plot.options).toEqual({
      grid: false,
      margin: 24,
      color: 'steelblue',
      x: { label: 'Day', domain: ['Mon', 'Tue'] },
      y: { label: 'Value', domain: [0, 20] },
    });
  });

  test('keeps only declarative plot rows and string mark fields', () => {
    const plot = normalizePlotSpec({
      data: [
        { day: 'Mon', value: 12, derive: () => 12 },
        ['Tue', 18],
        new XconObject({ day: 'Wed', value: 9 }),
      ],
      marks: [
        { type: 'line', x: 'day', y: 'value', stroke: 42 },
        { type: 'ruleY', y: 'limit', curve: 'basis' },
        null,
      ],
      options: { color: 'steelblue', label: () => 'unsafe' },
    });

    expect(plot.data).toEqual([
      { day: 'Mon', value: 12 },
      { day: 'Wed', value: 9 },
    ]);
    expect(plot.marks).toEqual([
      { type: 'line', x: 'day', y: 'value' },
      { type: 'ruleY', y: 'limit' },
    ]);
    expect(plot.options).toEqual({ color: 'steelblue' });
  });

  test('exports the full public alias list', () => {
    expect(advancedDataVizAliases).toEqual(['treemap', 'sankey', 'sunburst', 'chord', 'forceGraph', 'plot']);
  });

  test('converts plain objects and arrays without mutating them', () => {
    const input = { nested: [{ value: 1 }] };

    expect(toDataVizPlainValue(input)).toEqual({ nested: [{ value: 1 }] });
    expect(input).toEqual({ nested: [{ value: 1 }] });
  });
});
