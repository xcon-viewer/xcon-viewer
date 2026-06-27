import { describe, expect, test } from 'vitest';

import { normalizeDataVizComponent } from './data';
import { renderDataVizStaticFallback } from './static';

describe('dataViz static fallbacks', () => {
  test.each([
    ['treemap', 'xa-dataviz-preview--treemap'],
    ['sankey', 'xa-dataviz-preview--sankey'],
    ['sunburst', 'xa-dataviz-preview--sunburst'],
    ['chord', 'xa-dataviz-preview--chord'],
    ['forceGraph', 'xa-dataviz-preview--force-graph'],
    ['plot', 'xa-dataviz-preview--plot'],
  ])('renders %s fallback with a stable class', (vizType, className) => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType,
      data: sampleData(vizType),
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain(className);
    expect(html).toContain('<svg');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\son(?:click|load|error)=/i);
  });

  test('escapes text labels in static svg output', () => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'treemap',
      data: [{ label: '<script>alert(1)</script>', value: 4 }],
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('returns a compact empty fallback for invalid or empty data', () => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'sankey',
      data: [],
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain('xa-dataviz-empty');
    expect(html).toContain('No data');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\son(?:click|load|error)=/i);
  });

  test('drops unsafe paint values from svg attributes', () => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'sankey',
      data: {
        nodes: [
          { id: 'source', label: 'Source', color: 'url(javascript:alert(1))' },
          { id: 'target', label: 'Target' },
        ],
        links: [
          { source: 'source', target: 'target', value: 4, color: 'url(javascript:alert(1))' },
        ],
      },
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain('xa-dataviz-preview--sankey');
    expect(html).not.toContain('url(javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<[^>]+\son(?:click|load|error)=/i);
  });

  test('escapes event-looking labels without creating inline event attributes', () => {
    const label = '<img src=x onerror=alert(1)>';
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'treemap',
      data: [{ label, value: 4 }],
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<[^>]+\sonerror=/i);
  });

  test.each([
    ['sankey', { nodes: 'broken', links: [{ source: {}, target: null, value: 'bad' }] }],
    ['chord', { nodes: [{ id: 'one' }], links: [{ source: 'one' }] }],
    ['forceGraph', { nodes: [{ id: 'solo', label: { nested: true } }], links: 'broken' }],
    ['plot', { data: [{ category: 'A', value: 'not numeric' }], marks: [{ type: 'barY', x: 'category', y: 'value' }] }],
  ])('handles malformed %s data without throwing', (vizType, data) => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType,
      data,
    });

    expect(() => renderDataVizStaticFallback(model)).not.toThrow();
    const html = renderDataVizStaticFallback(model);

    expect(html).toMatch(/xa-dataviz-empty|<svg/);
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<[^>]+\son(?:click|load|error)=/i);
  });

  test.each([
    ['barX', { type: 'barX', x: 'value', y: 'category' }],
    ['line', { type: 'line', x: 'category', y: 'value' }],
    ['dot', { type: 'dot', x: 'category', y: 'value' }],
  ])('renders plot %s marks as safe static svg', (_name, mark) => {
    const model = normalizeDataVizComponent({
      type: 'dataViz',
      vizType: 'plot',
      data: {
        data: [
          { category: 'Alpha', value: 5 },
          { category: 'Beta', value: 9 },
        ],
        marks: [mark],
      },
    });

    const html = renderDataVizStaticFallback(model);

    expect(html).toContain('xa-dataviz-preview--plot');
    expect(html).toContain('<svg');
    expect(html).toContain('Alpha');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/\son(?:click|load|error)=/i);
  });
});

function sampleData(vizType: string): unknown {
  if (vizType === 'forceGraph') {
    return {
      nodes: [
        { id: 'source', label: 'Source' },
        { id: 'target', label: 'Target' },
      ],
      links: [{ source: 'source', target: 'target' }],
    };
  }

  if (vizType === 'sankey') {
    return {
      nodes: [
        { id: 'source', name: 'Source' },
        { id: 'target', name: 'Target' },
      ],
      links: [{ source: 'source', target: 'target', value: 8 }],
    };
  }

  if (vizType === 'chord') {
    return {
      nodes: [
        { id: 'alpha', label: 'Alpha' },
        { id: 'beta', label: 'Beta' },
        { id: 'gamma', label: 'Gamma' },
      ],
      links: [
        { source: 'alpha', target: 'beta', value: 5 },
        { source: 'beta', target: 'gamma', value: 3 },
      ],
    };
  }

  if (vizType === 'plot') {
    return {
      data: [
        { category: 'A', value: 5 },
        { category: 'B', value: 9 },
      ],
      marks: [{ type: 'barY', x: 'category', y: 'value' }],
    };
  }

  return {
    name: 'Ops',
    children: [
      { name: 'Queue', value: 38 },
      { name: 'Scheduler', value: 24 },
      { name: 'Runner', value: 18 },
    ],
  };
}
