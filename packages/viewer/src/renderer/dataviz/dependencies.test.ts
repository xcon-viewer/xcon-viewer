import { describe, expect, test } from 'vitest';
import { hierarchy, partition, treemap } from 'd3-hierarchy';
import { sankey } from 'd3-sankey';
import { forceSimulation } from 'd3-force';
import { chord } from 'd3-chord';
import * as Plot from '@observablehq/plot';

describe('advanced visualization direct dependencies', () => {
  test('exposes the modules used by public dataViz hydration', () => {
    expect(typeof hierarchy).toBe('function');
    expect(typeof treemap).toBe('function');
    expect(typeof partition).toBe('function');
    expect(typeof sankey).toBe('function');
    expect(typeof forceSimulation).toBe('function');
    expect(typeof chord).toBe('function');
    expect(typeof Plot.plot).toBe('function');
  });
});
