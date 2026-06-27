# Sprint 3 Visualization Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public viewer support for D3/Observable advanced `dataViz` visualizations, strengthened map layers, an advanced visualization test page, and Gowoori generation guidance.

**Architecture:** Keep `dataViz + vizType` as the canonical renderer contract, while accepting alias component types at the schema/validator/renderer surface. Split new visualization logic into focused `renderer/dataviz` and `renderer/map` modules, then wire those modules into the existing renderer and hydration entry points without weakening the viewer-only security boundary.

**Tech Stack:** TypeScript, Vitest, XCON core/parser/validator, `@xcon-viewer/viewer`, D3 modules (`d3-hierarchy`, `d3-sankey`, `d3-force`, `d3-chord`), `@observablehq/plot`, Leaflet CDN runtime, PowerShell, npm workspaces.

---

## Scope Check

The approved spec spans viewer, core/schema, public site, and Gowoori prompt generation. These are coupled by one public syntax contract, so one implementation plan is acceptable. Execute viewer/core/site work first; execute Gowoori updates after the public syntax and samples are stable.

The repository has unrelated dirty files. Stage and commit only the files listed in each task.

## File Structure

- Modify `packages/viewer/package.json` and `package-lock.json`: add direct viewer dependencies used by new runtime modules.
- Modify `packages/core/src/validator/index.ts`: allow the alias component types.
- Modify `packages/core/src/parser/property-types.ts`: add alias property contracts and map option properties.
- Modify `scripts/update-xcon-schema.mjs` and regenerate `schema/xcon.schema.json`: keep schema enum aligned with renderer cases.
- Create `packages/viewer/src/renderer/dataviz/types.ts`: public-safe internal dataViz model types and constants.
- Create `packages/viewer/src/renderer/dataviz/data.ts`: alias/type normalization, plain value conversion, safe numeric parsing, Plot mark sanitization.
- Create `packages/viewer/src/renderer/dataviz/static.ts`: static SVG/HTML fallback renderers for treemap, sankey, sunburst, chord, forceGraph, plot, and existing chart-like previews.
- Create `packages/viewer/src/renderer/dataviz/runtime.ts`: browser hydration for D3 and Observable Plot visualizations.
- Create `packages/viewer/src/renderer/dataviz/*.test.ts`: pure tests for data normalization, fallback output, and hydration contracts.
- Create `packages/viewer/src/renderer/map/types.ts`: normalized map marker/layer/plugin types.
- Create `packages/viewer/src/renderer/map/static.ts`: static map fallback and live Leaflet data attributes.
- Create `packages/viewer/src/renderer/map/runtime.ts`: Leaflet, heatmap, and clustering hydration helpers.
- Create `packages/viewer/src/renderer/map/*.test.ts`: map layer normalization and runtime plugin fallback tests.
- Modify `packages/viewer/src/renderer/index.ts`: import dataviz/map modules, add alias cases, remove duplicated local helper code only after tests cover it.
- Modify `packages/viewer/src/renderer/renderer.test.ts`: renderer integration tests for alias normalization, new fallback classes, map attrs, and schema alignment.
- Create `site/advanced-visualization-test.html`: shared test page UI.
- Create `site/advanced-visualization-test-entry.mjs`: source module re-exporting core/viewer.
- Create `site/advanced-visualization-test-runtime.js`: bundled local test runtime generated from the entry.
- Modify `site/network-diagram-test.html`: keep compatibility by linking to or reusing the advanced page without breaking current tests.
- Modify `scripts/site-structure.test.mjs`: assert the advanced page, `.js` runtime, and required sample names.
- Modify `docs/xcon-component-specs.en.md`, `docs/ecosystem.md`, `site/llms-full.txt`, and showcase examples as needed.
- Modify `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\gowooriRichComponentStrategy.ts`: add advanced `dataViz` selection, diagnostics, and snippets.
- Modify `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\gowooriPromptPacks.ts`: document canonical `dataViz + vizType` guidance.
- Modify selected `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\mockScenarios\*.ts`: keep existing dataViz scenarios canonical.

---

### Task 1: Direct Visualization Dependencies

**Files:**
- Modify: `packages/viewer/package.json`
- Modify: `package-lock.json`
- Create: `packages/viewer/src/renderer/dataviz/dependencies.test.ts`

- [ ] **Step 1: Write the failing dependency test**

Create `packages/viewer/src/renderer/dataviz/dependencies.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the dependency test and verify it fails**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/dependencies.test.ts
```

Expected: FAIL because `d3-sankey` and `@observablehq/plot` are not direct viewer dependencies.

- [ ] **Step 3: Install only the viewer dependencies**

Run:

```powershell
npm install --workspace @xcon-viewer/viewer d3-hierarchy d3-sankey d3-force d3-chord @observablehq/plot
npm install --workspace @xcon-viewer/viewer --save-dev @types/d3-sankey
```

Expected: `packages/viewer/package.json` lists the new runtime dependencies and `@types/d3-sankey` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 4: Run the dependency test again**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/dependencies.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit dependency changes**

Run:

```powershell
git add -- packages/viewer/package.json package-lock.json packages/viewer/src/renderer/dataviz/dependencies.test.ts
git commit -m "test(viewer): assert advanced visualization dependencies"
```

---

### Task 2: Core Alias And Schema Contract

**Files:**
- Modify: `packages/core/src/core.test.ts`
- Modify: `packages/core/src/validator/index.ts`
- Modify: `packages/core/src/parser/property-types.ts`
- Modify: `scripts/update-xcon-schema.mjs`
- Modify: `schema/xcon.schema.json`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Add failing core tests for alias component types and map options**

Append this test near existing parser/advanced component coverage in `packages/core/src/core.test.ts`:

```ts
test('accepts advanced dataViz aliases and map layer option properties', () => {
  const doc = fromSketch(`
    screen "Advanced Visualization Aliases" 800x420
      usageTree: treemap at 24 24 220 160
        data {"name":"Workspace","children":[{"name":"Viewer","value":42}]}
      flowCost: sankey at 260 24 220 160
        data {"nodes":[{"id":"a"},{"id":"b"}],"links":[{"source":"a","target":"b","value":7}]}
      radial: sunburst at 496 24 220 160
        data {"name":"Workspace","children":[{"name":"Core","value":28}]}
      matrix: chord at 24 220 220 160
        data {"labels":["A","B"],"matrix":[[0,2],[3,0]]}
      influence: forceGraph at 260 220 220 160
        data {"nodes":[{"id":"a"},{"id":"b"}],"links":[{"source":"a","target":"b"}]}
      trend: plot at 496 220 220 160
        data {"data":[{"day":"Mon","value":12}],"marks":[{"type":"barY","x":"day","y":"value"}]}
      geo: map at 24 390 300 160
        provider "leaflet"
        heatmapOptions {"radius":30,"blur":18}
        clusterOptions {"disableClusteringAtZoom":13}
  `);

  const components = normalize(getByPath(doc, 'components')) as Record<string, Record<string, unknown>>;
  expect(components.usageTree.type).toBe('treemap');
  expect(components.flowCost.type).toBe('sankey');
  expect(components.radial.type).toBe('sunburst');
  expect(components.matrix.type).toBe('chord');
  expect(components.influence.type).toBe('forceGraph');
  expect(components.trend.type).toBe('plot');
  expect(components.geo.heatmapOptions).toEqual({ radius: 30, blur: 18 });
  expect(components.geo.clusterOptions).toEqual({ disableClusteringAtZoom: 13 });

  expect(validate(doc).valid).toBe(true);
});
```

- [ ] **Step 2: Add failing renderer/schema alignment expectations**

In `packages/viewer/src/renderer/renderer.test.ts`, extend the existing schema property test list with:

```ts
'heatmapOptions',
'clusterOptions',
```

The existing schema enum alignment test will fail until alias renderer cases and schema enum values are added.

- [ ] **Step 3: Run the focused failing tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/core -- packages/core/src/core.test.ts -t "advanced dataViz aliases"
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/renderer.test.ts -t "public JSON schema"
```

Expected: FAIL because aliases are not validator/schema component types and map option properties are not in schema.

- [ ] **Step 4: Update public type/property lists**

Modify `packages/core/src/validator/index.ts`: add these values to `publicComponentTypes` next to `dataViz`:

```ts
'treemap',
'sankey',
'sunburst',
'chord',
'forceGraph',
'plot',
```

Modify `scripts/update-xcon-schema.mjs`: add the same values to `publicComponentTypes`.

Modify `packages/core/src/parser/property-types.ts`:

```ts
dataViz: { vizType: 'string', data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
treemap: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
sankey: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
sunburst: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
chord: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
forceGraph: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
plot: { data: 'json', config: 'json', interactive: 'boolean', allowPartial: 'boolean' },
```

Inside the existing `map` property contract, add:

```ts
heatmapOptions: 'json',
clusterOptions: 'json',
```

- [ ] **Step 5: Regenerate schema**

Run:

```powershell
node scripts/update-xcon-schema.mjs
```

Expected: `schema/xcon.schema.json` includes alias component enum values and map option properties.

- [ ] **Step 6: Run focused tests again**

Run:

```powershell
npm run test --workspace @xcon-viewer/core -- packages/core/src/core.test.ts -t "advanced dataViz aliases"
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/renderer.test.ts -t "public JSON schema"
```

Expected: the core test passes; the renderer schema enum test may still fail until Task 5 adds renderer alias cases.

- [ ] **Step 7: Commit core contract changes**

Run after Task 5 if renderer enum alignment is still failing:

```powershell
git add -- packages/core/src/core.test.ts packages/core/src/validator/index.ts packages/core/src/parser/property-types.ts scripts/update-xcon-schema.mjs schema/xcon.schema.json packages/viewer/src/renderer/renderer.test.ts
git commit -m "feat(core): allow advanced dataViz aliases"
```

---

### Task 3: DataViz Normalization Module

**Files:**
- Create: `packages/viewer/src/renderer/dataviz/types.ts`
- Create: `packages/viewer/src/renderer/dataviz/data.ts`
- Create: `packages/viewer/src/renderer/dataviz/data.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Create `packages/viewer/src/renderer/dataviz/data.test.ts`:

```ts
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
    const model = normalizeDataVizComponent(new XconObject({
      type: 'sankey',
      data: {
        nodes: [{ id: 'in' }, { id: 'out' }],
        links: [{ source: 'in', target: 'out', value: 12 }],
      },
    }));

    expect(model.type).toBe('dataViz');
    expect(model.vizType).toBe('sankey');
    expect(model.aliasType).toBe('sankey');
    expect(model.interactive).toBe(true);
  });

  test('keeps canonical dataViz vizType and converts XconObject data recursively', () => {
    const model = normalizeDataVizComponent(new XconObject({
      type: 'dataViz',
      vizType: 'treemap',
      data: new XconObject({
        name: 'Workspace',
        children: [new XconObject({ name: 'Viewer', value: 42 })],
      }),
      config: new XconObject({ theme: 'dark' }),
      interactive: false,
    }));

    expect(model.vizType).toBe('treemap');
    expect(model.data).toEqual({ name: 'Workspace', children: [{ name: 'Viewer', value: 42 }] });
    expect(model.config).toEqual({ theme: 'dark' });
    expect(model.interactive).toBe(false);
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

  test('exports the full public alias list', () => {
    expect(advancedDataVizAliases).toEqual(['treemap', 'sankey', 'sunburst', 'chord', 'forceGraph', 'plot']);
  });

  test('converts plain objects and arrays without mutating them', () => {
    const input = { nested: [{ value: 1 }] };
    expect(toDataVizPlainValue(input)).toEqual({ nested: [{ value: 1 }] });
    expect(input).toEqual({ nested: [{ value: 1 }] });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/data.test.ts
```

Expected: FAIL because the new module does not exist.

- [ ] **Step 3: Create `types.ts`**

Create `packages/viewer/src/renderer/dataviz/types.ts` with these exports:

```ts
export const dataVizAliasTypes = ['treemap', 'sankey', 'sunburst', 'chord', 'forceGraph', 'plot'] as const;
export type DataVizAliasType = (typeof dataVizAliasTypes)[number];
export type DataVizType = DataVizAliasType | 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter' | 'bubble' | string;

export interface DataVizModel {
  type: 'dataViz';
  vizType: DataVizType;
  aliasType?: DataVizAliasType;
  data: unknown;
  config: Record<string, unknown>;
  interactive: boolean;
  allowPartial: boolean;
}

export interface PlotMarkSpec {
  type: 'barY' | 'barX' | 'line' | 'areaY' | 'dot' | 'ruleY' | 'ruleX';
  x?: string;
  y?: string;
  fill?: string;
  stroke?: string;
}

export interface PlotSpec {
  data: Array<Record<string, unknown>>;
  marks: PlotMarkSpec[];
  options: Record<string, unknown>;
}
```

- [ ] **Step 4: Create `data.ts`**

Create `packages/viewer/src/renderer/dataviz/data.ts` with functions named in the tests. The implementation must:

```ts
import { isXconObject } from '@xcon-viewer/core';
import { dataVizAliasTypes, type DataVizAliasType, type DataVizModel, type PlotMarkSpec, type PlotSpec } from './types';

export const advancedDataVizAliases = Array.from(dataVizAliasTypes);

export function isDataVizAlias(value: unknown): value is DataVizAliasType {
  return dataVizAliasTypes.includes(value as DataVizAliasType);
}

export function toDataVizPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const output: Record<string, unknown> = {};
    value.forEach((child, key) => {
      output[key] = toDataVizPlainValue(child);
    });
    return output;
  }
  if (Array.isArray(value)) return value.map((item) => toDataVizPlainValue(item));
  if (isPlainRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) output[key] = toDataVizPlainValue(child);
    return output;
  }
  return value;
}

export function normalizeDataVizComponent(component: unknown): DataVizModel {
  const record = asRecord(toDataVizPlainValue(component)) ?? {};
  const rawType = stringValue(record.type) ?? 'dataViz';
  const aliasType = isDataVizAlias(rawType) ? rawType : undefined;
  const vizType = aliasType ?? stringValue(record.vizType) ?? stringValue(record.variant) ?? 'bar';
  return {
    type: 'dataViz',
    vizType,
    aliasType,
    data: record.data ?? [],
    config: sanitizeRecord(record.config),
    interactive: booleanValue(record.interactive, true),
    allowPartial: booleanValue(record.allowPartial, false),
  };
}

export function normalizePlotSpec(value: unknown): PlotSpec {
  const record = asRecord(toDataVizPlainValue(value)) ?? {};
  const rows = Array.isArray(record.data) ? record.data.map((item) => asRecord(item) ?? {}) : [];
  const marks = Array.isArray(record.marks) ? record.marks.map(normalizePlotMark).filter((mark): mark is PlotMarkSpec => Boolean(mark)) : [];
  return {
    data: rows,
    marks,
    options: sanitizeRecord(record.options),
  };
}

function normalizePlotMark(value: unknown): PlotMarkSpec | undefined {
  const record = asRecord(value);
  const type = stringValue(record?.type);
  if (!type || !['barY', 'barX', 'line', 'areaY', 'dot', 'ruleY', 'ruleX'].includes(type)) return undefined;
  return {
    type: type as PlotMarkSpec['type'],
    x: stringValue(record?.x),
    y: stringValue(record?.y),
    fill: stringValue(record?.fill),
    stroke: stringValue(record?.stroke),
  };
}

function sanitizeRecord(value: unknown): Record<string, unknown> {
  const record = asRecord(toDataVizPlainValue(value));
  if (!record) return {};
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    if (typeof child === 'function') continue;
    output[key] = child;
  }
  return output;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return fallback;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isPlainRecord(value) ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || isXconObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
```

- [ ] **Step 5: Run normalization tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/data.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit normalization module**

Run:

```powershell
git add -- packages/viewer/src/renderer/dataviz/types.ts packages/viewer/src/renderer/dataviz/data.ts packages/viewer/src/renderer/dataviz/data.test.ts
git commit -m "feat(viewer): normalize advanced dataViz models"
```

---

### Task 4: DataViz Static Fallbacks

**Files:**
- Create: `packages/viewer/src/renderer/dataviz/static.ts`
- Create: `packages/viewer/src/renderer/dataviz/static.test.ts`
- Modify: `packages/viewer/src/renderer/index.ts`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Write failing fallback tests**

Create `packages/viewer/src/renderer/dataviz/static.test.ts`:

```ts
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
});

function sampleData(vizType: string): unknown {
  if (vizType === 'sankey') {
    return { nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', value: 7 }] };
  }
  if (vizType === 'chord') return { labels: ['A', 'B'], matrix: [[0, 2], [3, 0]] };
  if (vizType === 'forceGraph') return { nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b' }] };
  if (vizType === 'plot') return { data: [{ day: 'Mon', value: 12 }], marks: [{ type: 'barY', x: 'day', y: 'value' }] };
  return { name: 'Root', children: [{ name: 'A', value: 10 }, { name: 'B', value: 6 }] };
}
```

- [ ] **Step 2: Run fallback tests and verify failure**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/static.test.ts
```

Expected: FAIL because `static.ts` is missing.

- [ ] **Step 3: Create fallback renderer module**

Create `packages/viewer/src/renderer/dataviz/static.ts`. Export:

```ts
import type { DataVizModel } from './types';
import { normalizePlotSpec } from './data';

export function renderDataVizStaticFallback(model: DataVizModel): string {
  const key = model.vizType.trim().toLowerCase();
  if (key === 'treemap') return renderTreemapFallback(model.data);
  if (key === 'sankey') return renderSankeyFallback(model.data);
  if (key === 'sunburst') return renderSunburstFallback(model.data);
  if (key === 'chord') return renderChordFallback(model.data);
  if (key === 'forcegraph' || key === 'force') return renderForceGraphFallback(model.data);
  if (key === 'plot') return renderPlotFallback(model.data);
  return renderGenericRowsFallback(model.data, 'xa-dataviz-preview');
}
```

The file must include local `tag()`, `attrs()`, `escapeHtml()`, `plainRecord()`, `finiteNumber()`, and SVG helpers so it has no dependency on private functions inside `renderer/index.ts`. Move or recreate the existing treemap/sunburst/forceGraph fallback behavior from `index.ts`, then add:

```ts
function renderSankeyFallback(data: unknown): string {
  const graph = sankeyData(data);
  if (graph.nodes.length === 0 || graph.links.length === 0) return emptyData();
  const nodeX = new Map(graph.nodes.map((node, index) => [node.id, index === 0 ? 60 : 430]));
  const nodeY = new Map(graph.nodes.map((node, index) => [node.id, 34 + index * 42]));
  const links = graph.links.map((link, index) => {
    const x1 = nodeX.get(link.source) ?? 60;
    const y1 = nodeY.get(link.source) ?? 70;
    const x2 = nodeX.get(link.target) ?? 430;
    const y2 = nodeY.get(link.target) ?? 70;
    return tag('path', {
      d: `M${x1},${y1} C${x1 + 120},${y1} ${x2 - 120},${y2} ${x2},${y2}`,
      fill: 'none',
      stroke: palette[index % palette.length],
      'stroke-width': String(Math.max(2, Math.min(18, link.value))),
      opacity: '0.58',
    }, '');
  }).join('');
  const nodes = graph.nodes.map((node, index) => {
    const x = nodeX.get(node.id) ?? 60;
    const y = nodeY.get(node.id) ?? 34;
    return tag('rect', { x: String(x), y: String(y), width: '54', height: '28', rx: '6', fill: palette[index % palette.length] }, '') +
      tag('text', { x: String(x + 66), y: String(y + 18), 'font-size': '11', fill: '#334155' }, escapeHtml(node.label));
  }).join('');
  return tag('svg', { class: 'xa-dataviz-preview xa-dataviz-preview--sankey', viewBox: '0 0 520 190', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, links + nodes);
}
```

Use the same deterministic, escaped output style for chord and plot fallback.

- [ ] **Step 4: Wire renderer integration tests**

In `packages/viewer/src/renderer/renderer.test.ts`, extend the existing `renders D3-style static dataViz previews without requiring runtime D3` test:

```ts
const sankey = renderToHtml({
  type: 'dataViz',
  vizType: 'sankey',
  data: { nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', value: 7 }] },
});
const chord = renderToHtml({
  type: 'dataViz',
  vizType: 'chord',
  data: { labels: ['A', 'B'], matrix: [[0, 2], [3, 0]] },
});
const plot = renderToHtml({
  type: 'dataViz',
  vizType: 'plot',
  data: { data: [{ day: 'Mon', value: 12 }], marks: [{ type: 'barY', x: 'day', y: 'value' }] },
});

expect(sankey).toContain('xa-dataviz-preview--sankey');
expect(chord).toContain('xa-dataviz-preview--chord');
expect(plot).toContain('xa-dataviz-preview--plot');
```

- [ ] **Step 5: Replace `renderStaticDataViz` internals**

Modify `packages/viewer/src/renderer/index.ts`:

```ts
import { normalizeDataVizComponent } from './dataviz/data';
import { renderDataVizStaticFallback } from './dataviz/static';
```

Inside `renderAdvancedDataViz`, replace the existing data/viz/config local construction with:

```ts
const model = normalizeDataVizComponent(component);
```

Set attributes from `model`, and replace:

```ts
renderStaticDataViz(data, vizType, config)
```

with:

```ts
renderDataVizStaticFallback(model)
```

Keep old chart preview helpers until no renderer tests depend on them, then remove only duplicated code made unreachable by this task.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/static.test.ts packages/viewer/src/renderer/renderer.test.ts -t "dataViz"
```

Expected: PASS.

- [ ] **Step 7: Commit static fallback changes**

Run:

```powershell
git add -- packages/viewer/src/renderer/dataviz/static.ts packages/viewer/src/renderer/dataviz/static.test.ts packages/viewer/src/renderer/index.ts packages/viewer/src/renderer/renderer.test.ts
git commit -m "feat(viewer): render advanced dataViz fallbacks"
```

---

### Task 5: Renderer Alias Cases And DataViz Hydration

**Files:**
- Create: `packages/viewer/src/renderer/dataviz/runtime.ts`
- Create: `packages/viewer/src/renderer/dataviz/runtime.test.ts`
- Modify: `packages/viewer/src/renderer/index.ts`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Write failing renderer alias tests**

Add this test to `packages/viewer/src/renderer/renderer.test.ts`:

```ts
test('renders advanced dataViz alias component types through the dataViz contract', () => {
  const treemap = renderToHtml({
    type: 'treemap',
    data: { name: 'Workspace', children: [{ name: 'Viewer', value: 42 }] },
  });
  const sankey = renderToHtml({
    type: 'sankey',
    data: { nodes: [{ id: 'a' }, { id: 'b' }], links: [{ source: 'a', target: 'b', value: 7 }] },
  });

  expect(treemap).toContain('class="xa-dataviz-container"');
  expect(treemap).toContain('data-xcon-dataviz-type="treemap"');
  expect(treemap).toContain('xa-dataviz-preview--treemap');
  expect(sankey).toContain('data-xcon-dataviz-type="sankey"');
  expect(sankey).toContain('xa-dataviz-preview--sankey');
});
```

- [ ] **Step 2: Write failing hydration tests**

Create `packages/viewer/src/renderer/dataviz/runtime.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'vitest';
import { hydrateDataVizComponents } from './runtime';

describe('dataViz runtime hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('hydrates a treemap host and marks it bound', () => {
    document.body.innerHTML = `
      <div data-xcon-dataviz-root>
        <div id="viz"
          data-xcon-dataviz-type="treemap"
          data-xcon-dataviz-data='{"name":"Workspace","children":[{"name":"Viewer","value":42}]}'
          data-xcon-dataviz-config='{}'
          data-xcon-dataviz-interactive="true"><svg data-fallback="true"></svg></div>
      </div>
    `;

    hydrateDataVizComponents(document);

    const host = document.getElementById('viz');
    expect(host?.dataset.xconDatavizBound).toBe('true');
    expect(host?.querySelector('svg')).not.toBeNull();
    expect(host?.querySelector('[data-fallback="true"]')).toBeNull();
  });

  test('does not execute function-like Plot options from data attributes', () => {
    document.body.innerHTML = `
      <div id="plot"
        data-xcon-dataviz-type="plot"
        data-xcon-dataviz-data='{"data":[{"day":"Mon","value":12}],"marks":[{"type":"barY","x":"day","y":"value"}],"options":{"tickFormat":"() => alert(1)"}}'
        data-xcon-dataviz-config='{}'
        data-xcon-dataviz-interactive="true"><svg data-fallback="true"></svg></div>
    `;

    hydrateDataVizComponents(document);

    expect(document.getElementById('plot')?.dataset.xconDatavizBound).toBe('true');
  });
});
```

- [ ] **Step 3: Run failing tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/runtime.test.ts packages/viewer/src/renderer/renderer.test.ts -t "advanced dataViz alias"
```

Expected: FAIL because alias cases and runtime module are missing.

- [ ] **Step 4: Add renderer alias cases**

Modify `renderComponent()` in `packages/viewer/src/renderer/index.ts`. Add these cases directly before `case 'dataViz':`:

```ts
case 'treemap':
case 'sankey':
case 'sunburst':
case 'chord':
case 'forceGraph':
case 'plot':
  return renderAdvancedDataViz(component, attrs);
```

Because `normalizeDataVizComponent()` reads the component type, each alias will hydrate with the matching `vizType`.

- [ ] **Step 5: Create dataViz runtime**

Create `packages/viewer/src/renderer/dataviz/runtime.ts`. Export:

```ts
export function hydrateDataVizComponents(root: ParentNode = document): void;
```

The function must:

- Select `[data-xcon-dataviz-type]`.
- Skip hosts with `data-xcon-dataviz-bound="true"` or `"pending"`.
- Parse `data-xcon-dataviz-data` and `data-xcon-dataviz-config` with a safe `JSON.parse` helper.
- Use `d3-hierarchy` for `treemap` and `sunburst`.
- Use `d3-sankey` for `sankey`.
- Use `d3-chord` for `chord`.
- Use `d3-force` for `forceGraph`.
- Use `@observablehq/plot` for `plot`.
- Replace only the host children.
- Set `data-xcon-dataviz-bound="true"` on success.
- Set `data-xcon-dataviz-bound="failed"` and keep fallback children on failure.

Use direct imports:

```ts
import { hierarchy, partition, treemap } from 'd3-hierarchy';
import { sankey as createSankey } from 'd3-sankey';
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { chord as createChord } from 'd3-chord';
import * as Plot from '@observablehq/plot';
```

- [ ] **Step 6: Wire hydration entry point**

Modify `packages/viewer/src/renderer/index.ts`:

```ts
import { hydrateDataVizComponents } from './dataviz/runtime';
```

Call it in `hydrateXconViewer()` before `hydrateLeafletMaps(root)`:

```ts
hydrateDataVizComponents(root);
```

Also add a minimal `viewerScript` mirror for standalone `renderToFullHtml()` output. The inline script must discover `[data-xcon-dataviz-type]`, mark unsupported inline hydration as `data-xcon-dataviz-bound="static"`, and keep fallback visible. This keeps full HTML safe until the bundled ESM runtime hydrates richer pages.

- [ ] **Step 7: Run alias/schema/runtime tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/dataviz/runtime.test.ts packages/viewer/src/renderer/renderer.test.ts -t "advanced dataViz alias|public JSON schema"
```

Expected: PASS.

- [ ] **Step 8: Commit runtime changes**

Run:

```powershell
git add -- packages/viewer/src/renderer/dataviz/runtime.ts packages/viewer/src/renderer/dataviz/runtime.test.ts packages/viewer/src/renderer/index.ts packages/viewer/src/renderer/renderer.test.ts
git commit -m "feat(viewer): hydrate advanced dataViz components"
```

---

### Task 6: Map Module Extraction And Plugin Fallbacks

**Files:**
- Create: `packages/viewer/src/renderer/map/types.ts`
- Create: `packages/viewer/src/renderer/map/static.ts`
- Create: `packages/viewer/src/renderer/map/runtime.ts`
- Create: `packages/viewer/src/renderer/map/runtime.test.ts`
- Modify: `packages/viewer/src/renderer/index.ts`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Write failing map runtime tests**

Create `packages/viewer/src/renderer/map/runtime.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { applyLeafletMapLayers } from './runtime';

describe('map runtime layer hydration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('applies polylines polygons heatmap and marker clustering when plugins exist', () => {
    const host = document.createElement('div');
    host.setAttribute('data-xcon-map-polylines', JSON.stringify([{ points: [[37.5, 126.9], [37.6, 127.0]], color: '#2563eb' }]));
    host.setAttribute('data-xcon-map-polygons', JSON.stringify([{ points: [[37.5, 126.9], [37.6, 126.9], [37.6, 127.0]], color: '#14b8a6' }]));
    host.setAttribute('data-xcon-map-heatmap', JSON.stringify([[37.5, 126.9, 0.8]]));
    host.setAttribute('data-xcon-map-clustering', 'true');

    const map = { addLayer: vi.fn() };
    const markerOne = { addTo: vi.fn(() => markerOne), bindPopup: vi.fn() };
    const markerTwo = { addTo: vi.fn(() => markerTwo), bindPopup: vi.fn() };
    const clusterGroup = { addLayer: vi.fn(), addTo: vi.fn() };
    const leaflet = {
      polyline: vi.fn(() => ({ addTo: vi.fn() })),
      polygon: vi.fn(() => ({ addTo: vi.fn() })),
      heatLayer: vi.fn(() => ({ addTo: vi.fn() })),
      markerClusterGroup: vi.fn(() => clusterGroup),
      marker: vi.fn()
        .mockReturnValueOnce(markerOne)
        .mockReturnValueOnce(markerTwo),
      divIcon: vi.fn(() => ({})),
    };

    applyLeafletMapLayers(leaflet, map, host, [
      { lat: 37.5, lng: 126.9, label: 'A' },
      { lat: 37.6, lng: 127.0, label: 'B' },
    ]);

    expect(leaflet.polyline).toHaveBeenCalledTimes(1);
    expect(leaflet.polygon).toHaveBeenCalledTimes(1);
    expect(leaflet.heatLayer).toHaveBeenCalledTimes(1);
    expect(leaflet.markerClusterGroup).toHaveBeenCalledTimes(1);
    expect(clusterGroup.addLayer).toHaveBeenCalledTimes(2);
  });

  test('renders markers without clustering when markercluster is unavailable', () => {
    const host = document.createElement('div');
    host.setAttribute('data-xcon-map-clustering', 'true');
    const marker = { addTo: vi.fn(() => marker), bindPopup: vi.fn() };
    const leaflet = {
      marker: vi.fn(() => marker),
      divIcon: vi.fn(() => ({})),
    };

    applyLeafletMapLayers(leaflet, {}, host, [{ lat: 37.5, lng: 126.9, label: 'A' }]);

    expect(marker.addTo).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run failing map tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/map/runtime.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Create map runtime module**

Create `packages/viewer/src/renderer/map/runtime.ts` and move the existing map runtime helpers from `index.ts` into it. Export:

```ts
export function hydrateLeafletMaps(root?: ParentNode): void;
export function applyLeafletMapLayers(leaflet: unknown, map: unknown, host: HTMLElement, markers?: Array<Record<string, unknown>>): void;
```

Add controlled plugin URLs:

```ts
const leafletHeatJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js';
const leafletMarkerClusterJsUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const leafletMarkerClusterCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
const leafletMarkerClusterDefaultCssUrl = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
```

Implement plugin loaders so failure resolves to `undefined`, not a thrown render failure. `hydrateLeafletMaps()` should call base Leaflet first, then attempt plugin loads only when `heatmap` or `clustering` data is present.

- [ ] **Step 4: Create map static module**

Create `packages/viewer/src/renderer/map/static.ts` and move `renderStaticMap()`, `leafletTileUrl()`, and `mapMarkerData()` from `index.ts`. Export:

```ts
export function renderMapStatic(component: XconObject, context: RenderContextLike): string;
```

Use this local interface to avoid importing private renderer internals:

```ts
export interface RenderContextLike {
  options: { allowExternalResources: boolean };
}
```

Add `data-xcon-map-heatmap-options` and `data-xcon-map-cluster-options` attributes when the corresponding properties exist and live Leaflet is enabled.

- [ ] **Step 5: Wire renderer to map modules**

Modify `packages/viewer/src/renderer/index.ts`:

```ts
import { hydrateLeafletMaps } from './map/runtime';
import { renderMapStatic } from './map/static';
```

Replace `renderStaticMap(component, context)` inside `renderAdvancedMap()` with:

```ts
renderMapStatic(component, context)
```

Remove the duplicated map helper functions from `index.ts` after the import compiles.

- [ ] **Step 6: Extend renderer integration test**

In `packages/viewer/src/renderer/renderer.test.ts`, extend the map test to include:

```ts
heatmapOptions: { radius: 30, blur: 20 },
clusterOptions: { disableClusteringAtZoom: 13 },
```

Add expectations:

```ts
expect(liveHtml).toContain('data-xcon-map-heatmap-options=');
expect(liveHtml).toContain('data-xcon-map-cluster-options=');
expect(viewerScript).toContain('leaflet.markercluster');
expect(viewerScript).toContain('leaflet.heat');
```

- [ ] **Step 7: Run map tests**

Run:

```powershell
npm run test --workspace @xcon-viewer/viewer -- packages/viewer/src/renderer/map/runtime.test.ts packages/viewer/src/renderer/renderer.test.ts -t "Leaflet|map"
```

Expected: PASS.

- [ ] **Step 8: Commit map changes**

Run:

```powershell
git add -- packages/viewer/src/renderer/map packages/viewer/src/renderer/index.ts packages/viewer/src/renderer/renderer.test.ts
git commit -m "feat(viewer): enhance map layer hydration"
```

---

### Task 7: Advanced Visualization Test Page

**Files:**
- Create: `site/advanced-visualization-test.html`
- Create: `site/advanced-visualization-test-entry.mjs`
- Create: `site/advanced-visualization-test-runtime.js`
- Modify: `site/network-diagram-test.html`
- Modify: `scripts/site-structure.test.mjs`

- [ ] **Step 1: Write failing site structure test**

Add a new test to `scripts/site-structure.test.mjs` after the network diagram test:

```js
test('serves the advanced visualization test page with bundled local runtime and required samples', () => {
  const testPagePath = join(rootDir, 'site', 'advanced-visualization-test.html');
  const runtimePath = join(rootDir, 'site', 'advanced-visualization-test-runtime.js');
  const testPage = readFileSync(testPagePath, 'utf8');

  expect(testPage).not.toContain('href="/styles.css"');
  expect(testPage).toContain("from '/site/advanced-visualization-test-runtime.js'");
  expect(testPage).not.toContain('advanced-visualization-test-runtime.mjs');
  expect(testPage).not.toContain('@xcon-viewer/viewer');
  expect(testPage).toContain('const samples = [');
  for (const id of ['network-runtime', 'dataviz-treemap', 'dataviz-sankey', 'dataviz-sunburst', 'dataviz-chord', 'dataviz-forcegraph', 'dataviz-plot', 'map-layers']) {
    expect(testPage).toContain(`id: '${id}'`);
  }
  expect(testPage).toContain('id="source"');
  expect(testPage).toContain('id="preview"');
  expect(testPage).toContain('id="sampleSelect"');
  expect(existsSync(runtimePath)).toBe(true);

  const runtime = readFileSync(runtimePath, 'utf8');
  expect(runtime).not.toMatch(/^import\s/m);
  expect(runtime).not.toContain("from './network/runtime'");
  expect(runtime).not.toContain("from './dataviz/runtime'");
  expect(runtime).not.toContain("from './map/runtime'");
});
```

- [ ] **Step 2: Run site test and verify failure**

Run:

```powershell
vitest run scripts/site-structure.test.mjs -t "advanced visualization test page"
```

Expected: FAIL because the page and runtime are missing.

- [ ] **Step 3: Create test entry**

Create `site/advanced-visualization-test-entry.mjs`:

```js
export { parseBySyntax } from '../packages/core/src/index.ts';
export { render, viewerCss } from '../packages/viewer/src/index.ts';
```

- [ ] **Step 4: Create advanced page**

Base `site/advanced-visualization-test.html` on the existing `site/network-diagram-test.html` layout. Change title and subtitle to advanced visualization language. Keep the same editor/preview/status workflow and define these sample IDs exactly:

```js
const samples = [
  { id: 'network-runtime', name: 'Network Diagram Runtime', sketch: `screen "Network Diagram Runtime" 980x620 bg #eef4fb
  network: networkDiagram at 24 96 932 492
    theme "obsidian"
    showControls true
    showSearch true
    showFilters true
    showLegend true
    nodes [{"id":"viewer","label":"Viewer runtime","group":"runtime"},{"id":"core","label":"Core parser","group":"parser"}]
    links [{"source":"viewer","target":"core","type":"contract"}]` },
  { id: 'dataviz-treemap', name: 'DataViz Treemap', sketch: `screen "Treemap" 760x460
  usageTree: dataViz at 24 80 700 320
    vizType "treemap"
    data {"name":"Workspace","children":[{"name":"Viewer","value":42},{"name":"Core","value":28},{"name":"Site","value":16}]}` },
  { id: 'dataviz-sankey', name: 'DataViz Sankey', sketch: `screen "Sankey" 760x460
  flow: dataViz at 24 80 700 320
    vizType "sankey"
    data {"nodes":[{"id":"input","label":"Input"},{"id":"process","label":"Process"},{"id":"output","label":"Output"}],"links":[{"source":"input","target":"process","value":18},{"source":"process","target":"output","value":12}]}` },
  { id: 'dataviz-sunburst', name: 'DataViz Sunburst', sketch: `screen "Sunburst" 760x460
  radial: dataViz at 24 80 700 320
    vizType "sunburst"
    data {"name":"Workspace","children":[{"name":"Runtime","value":34},{"name":"Docs","value":18},{"name":"Tests","value":22}]}` },
  { id: 'dataviz-chord', name: 'DataViz Chord', sketch: `screen "Chord" 760x460
  matrix: dataViz at 24 80 700 320
    vizType "chord"
    data {"labels":["Viewer","Core","Site"],"matrix":[[0,12,8],[9,0,6],[5,4,0]]}` },
  { id: 'dataviz-forcegraph', name: 'DataViz ForceGraph', sketch: `screen "ForceGraph" 760x460
  relations: dataViz at 24 80 700 320
    vizType "forceGraph"
    data {"nodes":[{"id":"viewer","label":"Viewer"},{"id":"core","label":"Core"},{"id":"site","label":"Site"}],"links":[{"source":"viewer","target":"core"},{"source":"viewer","target":"site"}]}` },
  { id: 'dataviz-plot', name: 'Observable Plot', sketch: `screen "Observable Plot" 760x460
  plotView: dataViz at 24 80 700 320
    vizType "plot"
    data {"data":[{"day":"Mon","value":12},{"day":"Tue","value":18},{"day":"Wed","value":15}],"marks":[{"type":"barY","x":"day","y":"value"}],"options":{"grid":true}}` },
  { id: 'map-layers', name: 'Map Layers', sketch: `screen "Map Layers" 760x520
  geo: map at 24 80 700 360
    provider "leaflet"
    latitude 37.5665
    longitude 126.978
    zoom 11
    markers [{"lat":37.5665,"lng":126.978,"label":"City Hall"},{"lat":37.5704,"lng":126.983,"label":"Studio"}]
    polylines [{"points":[[37.5665,126.978],[37.5704,126.983]],"color":"#2563eb"}]
    polygons [{"points":[[37.56,126.97],[37.58,126.97],[37.58,127.0]],"color":"#14b8a6"}]
    heatmap [[37.5665,126.978,0.8],[37.5704,126.983,0.5]]
    clustering true` },
];
```

Keep inline CSS in the page so the earlier `/styles.css` 404 cannot return.

- [ ] **Step 5: Generate the local runtime bundle**

Run:

```powershell
npx esbuild site/advanced-visualization-test-entry.mjs --bundle --format=esm --platform=browser --outfile=site/advanced-visualization-test-runtime.js
```

Expected: `site/advanced-visualization-test-runtime.js` exists and has no top-level local imports.

- [ ] **Step 6: Preserve network page compatibility**

Keep `site/network-diagram-test.html` runnable. Add a topbar link to `/site/advanced-visualization-test.html` or leave the existing page unchanged if site tests already pass. Do not remove the current network test samples.

- [ ] **Step 7: Run site tests**

Run:

```powershell
vitest run scripts/site-structure.test.mjs -t "advanced visualization test page|network diagram test page"
```

Expected: PASS.

- [ ] **Step 8: Commit site test page**

Run:

```powershell
git add -- site/advanced-visualization-test.html site/advanced-visualization-test-entry.mjs site/advanced-visualization-test-runtime.js site/network-diagram-test.html scripts/site-structure.test.mjs
git commit -m "docs(site): add advanced visualization test page"
```

---

### Task 8: Public Docs And Examples

**Files:**
- Modify: `docs/xcon-component-specs.en.md`
- Modify: `docs/ecosystem.md`
- Modify: `site/llms-full.txt`
- Modify: `examples/showcase/README.md`
- Create or modify: `examples/showcase/p_dataviz_advanced.xcon.sketch`
- Create or modify related JSON/XML/TAGLESS showcase files only if the existing showcase pattern requires parallel formats.

- [ ] **Step 1: Add failing public text checks**

Extend `scripts/site-structure.test.mjs` in the public docs/discovery area:

```js
test('documents advanced visualization Sprint 3 public syntax', () => {
  const componentSpecs = readFileSync(join(rootDir, 'docs', 'xcon-component-specs.en.md'), 'utf8');
  const llmsFull = readFileSync(join(rootDir, 'site', 'llms-full.txt'), 'utf8');

  for (const text of [componentSpecs, llmsFull]) {
    expect(text).toContain('dataViz');
    expect(text).toContain('vizType "treemap"');
    expect(text).toContain('vizType "sankey"');
    expect(text).toContain('vizType "sunburst"');
    expect(text).toContain('vizType "chord"');
    expect(text).toContain('vizType "forceGraph"');
    expect(text).toContain('vizType "plot"');
  }
});
```

- [ ] **Step 2: Run docs test and verify failure**

Run:

```powershell
vitest run scripts/site-structure.test.mjs -t "advanced visualization Sprint 3"
```

Expected: FAIL until docs are updated.

- [ ] **Step 3: Update docs**

Add a compact section to `docs/xcon-component-specs.en.md` documenting:

```xcon-sketch
usageTree: dataViz at 24 120 360 260
  vizType "treemap"
  data {"name":"Workspace","children":[{"name":"Viewer","value":42},{"name":"Core","value":28}]}
```

List the six supported `vizType` values and explain that `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, and `plot` are accepted alias component types but generated examples should prefer `dataViz + vizType`.

Update `site/llms-full.txt` with the same canonical guidance.

Update `docs/ecosystem.md` to mention the advanced visualization test page.

- [ ] **Step 4: Add showcase example**

Create `examples/showcase/p_dataviz_advanced.xcon.sketch` with one screen containing six compact `dataViz` panels using the sample data from Task 7. Link it from `examples/showcase/README.md`.

- [ ] **Step 5: Run docs tests**

Run:

```powershell
vitest run scripts/site-structure.test.mjs -t "advanced visualization Sprint 3|public site and package-facing docs free"
```

Expected: PASS and no private branding failures.

- [ ] **Step 6: Commit docs**

Run:

```powershell
git add -- docs/xcon-component-specs.en.md docs/ecosystem.md site/llms-full.txt examples/showcase/README.md examples/showcase/p_dataviz_advanced.xcon.sketch scripts/site-structure.test.mjs
git commit -m "docs: document advanced dataViz syntax"
```

---

### Task 9: Gowoori Public Visualization Guidance

**Files:**
- Modify: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\gowooriRichComponentStrategy.ts`
- Modify: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\gowooriPromptPacks.ts`
- Modify: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\mockScenarios\analytics.ts`
- Modify: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\mockScenarios\cyber.ts`
- Modify: `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\mockScenarios\viewer.ts`

- [ ] **Step 1: Write failing Gowoori strategy checks**

Add tests to the Desk test file that best matches strategy source checks. If no strategy test exists, create:

`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\gowooriRichComponentStrategy.test.ts`

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGowooriRichComponentStrategyLines,
  getGowooriRichComponentDiagnostics,
  getGowooriRichComponentRequirements,
} from './gowooriRichComponentStrategy';

test('Gowoori recommends canonical dataViz for advanced analysis prompts', () => {
  const requirements = getGowooriRichComponentRequirements('비용 흐름 sankey와 계층 treemap 분석 대시보드를 만들어줘', { intent: 'dashboard' });
  assert.ok(requirements.some((item) => item.component === 'dataViz'));

  const lines = createGowooriRichComponentStrategyLines('비용 흐름 sankey와 계층 treemap 분석 대시보드를 만들어줘', { intent: 'dashboard' });
  const text = lines.join('\n');
  assert.match(text, /dataViz/);
  assert.match(text, /vizType "sankey"/);
  assert.match(text, /vizType "treemap"/);
});

test('Gowoori diagnostics require vizType and data for dataViz blocks', () => {
  const diagnostics = getGowooriRichComponentDiagnostics(
    'sankey 흐름 분석을 만들어줘',
    'screen "Bad" 600x420\n  flow: dataViz at 24 80 520 260\n',
    { intent: 'dashboard' },
  );

  assert.ok(diagnostics.some((item) => item.message.includes('vizType')));
  assert.ok(diagnostics.some((item) => item.message.includes('data')));
});
```

- [ ] **Step 2: Run failing Desk tests**

Run from `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk`:

```powershell
npm test -- --test-name-pattern "Gowoori recommends canonical dataViz"
```

If the project does not use `npm test`, run the existing node test command used by adjacent Gowoori tests:

```powershell
node --test src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriRichComponentStrategy.test.ts
```

Expected: FAIL until `dataViz` is added to the strategy type union and rules.

- [ ] **Step 3: Extend Gowoori strategy**

Modify `gowooriRichComponentStrategy.ts`:

- Add `'dataViz'` to `GowooriRichComponentId`.
- Add a component rule with patterns for `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, `plot`, hierarchy, flow, matrix, exploratory visualization, and advanced analytics.
- Add property contracts:

```ts
dataViz: [
  { label: 'vizType', pattern: /^\s*vizType\s+"?(?:treemap|sankey|sunburst|chord|forceGraph|plot)"?/im },
  { label: 'data', pattern: /^\s*data\s+(?:\{|\[|\$[A-Za-z_])/im },
],
```

- Add snippets for canonical `dataViz + vizType`, including treemap and sankey at minimum.
- Update selection matrix text to say advanced visualizations use `dataViz` with `vizType`.

- [ ] **Step 4: Update prompt packs**

Modify `gowooriPromptPacks.ts`:

- Add `dataViz` to the public-safe component list.
- In dashboard recipes, add lines:

```text
Use `dataViz` with `vizType "treemap"` for hierarchical proportions.
Use `dataViz` with `vizType "sankey"` for flow, cost, or transfer volume.
Use `dataViz` with `vizType "sunburst"` for radial hierarchy.
Use `dataViz` with `vizType "chord"` for relationship matrices.
Use `dataViz` with `vizType "forceGraph"` for compact relationship previews.
Use `dataViz` with `vizType "plot"` for concise exploratory charts.
Prefer canonical `dataViz + vizType` over alias component types in generated artifacts.
```

- [ ] **Step 5: Review mock scenarios**

Search:

```powershell
rg -n "vizType|treemap|sunburst|forceGraph|sankey|chord|plot" "D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.workflow-runner\gowoori\agent\mockScenarios"
```

Ensure each advanced visualization is canonical:

```xcon-sketch
componentName: dataViz at x y w h
  vizType "treemap"
  data {"name":"Workspace","children":[{"name":"Viewer","value":42},{"name":"Core","value":28}]}
```

Do not convert `networkDiagram` to `forceGraph`.

- [ ] **Step 6: Run Desk tests**

Run from `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk`:

```powershell
node --test src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriRichComponentStrategy.test.ts
node --test src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriMockRouting.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Desk changes separately**

Run from `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk`:

```powershell
git add -- src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriRichComponentStrategy.ts src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriRichComponentStrategy.test.ts src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriPromptPacks.ts src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/mockScenarios/analytics.ts src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/mockScenarios/cyber.ts src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/mockScenarios/viewer.ts
git commit -m "feat(gowoori): guide advanced public dataViz generation"
```

---

### Task 10: Final Verification And Public Build

**Files:**
- Verify: all modified xcon-viewer files
- Verify: selected xenesis-desk files from Task 9

- [ ] **Step 1: Run focused xcon-viewer test suites**

Run from `D:\CodeTruck\CodeBox\Xamong\06 XCON\xcon-viewer`:

```powershell
npm run test --workspace @xcon-viewer/core
npm run test --workspace @xcon-viewer/viewer
vitest run scripts/site-structure.test.mjs
vitest run scripts/xcon-schema.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run full public verification**

Run:

```powershell
npm run typecheck
npm run test:public
npm run build --workspace @xcon-viewer/core
npm run build --workspace @xcon-viewer/viewer
```

Expected: PASS. If full workspace typecheck is blocked by unrelated dirty files, record the exact failing file paths and rerun the focused core/viewer/site commands.

- [ ] **Step 3: Smoke test the advanced visualization page**

Run:

```powershell
node scripts/serve-static.mjs
```

Open:

```text
http://127.0.0.1:4173/site/advanced-visualization-test.html
```

Verify manually:

- Network sample hydrates with controls.
- Treemap, sankey, sunburst, chord, forceGraph, and plot samples render non-empty SVG/HTML.
- Map sample renders a static fallback when external resources are off and live Leaflet layers when the viewer is called with `allowExternalResources: true`.
- The page has no `/styles.css` 404 and no `.mjs` MIME error.

- [ ] **Step 4: Inspect git status**

Run:

```powershell
git status --short
```

Expected: only intentional uncommitted files remain. Do not revert unrelated user changes.

- [ ] **Step 5: Commit any final xcon-viewer verification updates**

If Task 10 required fixes in xcon-viewer, stage only files that belong to Sprint 3 from this list:

```powershell
git add -- packages/viewer/package.json package-lock.json packages/core/src/core.test.ts packages/core/src/validator/index.ts packages/core/src/parser/property-types.ts scripts/update-xcon-schema.mjs schema/xcon.schema.json packages/viewer/src/renderer/index.ts packages/viewer/src/renderer/renderer.test.ts packages/viewer/src/renderer/dataviz packages/viewer/src/renderer/map site/advanced-visualization-test.html site/advanced-visualization-test-entry.mjs site/advanced-visualization-test-runtime.js site/network-diagram-test.html scripts/site-structure.test.mjs docs/xcon-component-specs.en.md docs/ecosystem.md site/llms-full.txt examples/showcase/README.md examples/showcase/p_dataviz_advanced.xcon.sketch
git commit -m "test(viewer): verify sprint 3 visualizations"
```
