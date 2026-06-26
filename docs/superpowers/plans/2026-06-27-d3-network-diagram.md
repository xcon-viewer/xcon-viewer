# D3 Network Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade public `networkDiagram` from static SVG preview to a D3-powered Obsidian-like interactive graph while preserving safe static fallback behavior.

**Architecture:** Keep `type: "networkDiagram"` public API unchanged. Split graph data normalization, theme resolution, static fallback rendering, state logic, and browser D3 hydration into focused files under `packages/viewer/src/renderer/network/`, with `packages/viewer/src/renderer/index.ts` only wiring wrapper markup and hydration calls. `renderToHtml()` and standalone `renderDocument()` keep a safe static fallback; ESM/Web Component hydration upgrades to D3 when the viewer runtime is loaded.

**Tech Stack:** TypeScript, Vitest, XCON core model/parser, `d3` npm dependency, SVG DOM, existing viewer sanitization and hydration patterns.

---

## Scope Check

This is one subsystem: the public viewer `networkDiagram` component. The plan avoids unrelated renderer refactors and does not introduce a new package. It intentionally treats huge graphs over 1,000 nodes as a later canvas/Web Worker project.

## File Structure

- Create `packages/viewer/src/renderer/network/types.ts`
  - Shared internal graph, theme, state, and runtime interfaces.
- Create `packages/viewer/src/renderer/network/data.ts`
  - Converts `XconObject`, plain objects, `nodes[]` / `links[]`, `edges`, and full-version `data.list` structures into `NetworkGraphModel`.
- Create `packages/viewer/src/renderer/network/data.test.ts`
  - Tests public and full-version data normalization.
- Create `packages/viewer/src/renderer/network/theme.ts`
  - Resolves `obsidian`, `light`, `auto`, and `custom` theme tokens into safe string values.
- Create `packages/viewer/src/renderer/network/theme.test.ts`
  - Tests theme defaults, luminance-based `auto`, and custom token override behavior.
- Create `packages/viewer/src/renderer/network/static.ts`
  - Renders static SVG fallback and wrapper data attributes from a normalized model.
- Create `packages/viewer/src/renderer/network/static.test.ts`
  - Tests fallback SVG output, escaped text, `links` / `edges`, and data attributes.
- Create `packages/viewer/src/renderer/network/state.ts`
  - Pure graph state helpers for search, filter, selection, neighbor highlighting, and folder expand/collapse.
- Create `packages/viewer/src/renderer/network/state.test.ts`
  - Tests search/filter/selection/folder behavior without D3.
- Create `packages/viewer/src/renderer/network/runtime.ts`
  - Browser-only D3 runtime that hydrates marked `networkDiagram` hosts.
- Create `packages/viewer/src/renderer/network/runtime.test.ts`
  - Tests safe hydration wiring and local-only DOM state in jsdom.
- Modify `packages/viewer/src/renderer/index.ts`
  - Import network static/runtime helpers, replace current network static implementation, and call `hydrateNetworkDiagrams()`.
- Modify `packages/viewer/src/renderer/renderer.test.ts`
  - Update existing `networkDiagram` expectations and add integration/security assertions.
- Modify `packages/viewer/package.json`
  - Add `d3` dependency and `@types/d3` dev dependency.
- Modify `package-lock.json`
  - Capture dependency lockfile changes from npm install.
- Modify `packages/core/src/parser/property-types.ts`
  - Add new public property coercions for network themes, controls, filters, and visual tokens.
- Modify `schema/xcon.schema.json`, `scripts/update-xcon-schema.mjs`, and `scripts/xcon-schema.test.mjs`
  - Expose new safe public properties and keep executable props out.
- Modify `examples/showcase/p_network_diagram.xcon*`
  - Refresh showcase with Obsidian-like default and `links` standard.
- Modify `docs/xcon-component-specs.en.md`, `docs/ecosystem.md`, `site/llms-full.txt`, and relevant prompts
  - Document safe local-only interactive graph behavior.

## Task 1: Add D3 Dependency And Core Property Coverage

**Files:**
- Modify: `packages/viewer/package.json`
- Modify: `package-lock.json`
- Modify: `packages/core/src/parser/property-types.ts`
- Modify: `packages/core/src/core.test.ts`

- [ ] **Step 1: Install D3 dependencies**

Run:

```powershell
npm install --workspace @xcon-viewer/viewer d3
npm install --workspace @xcon-viewer/viewer --save-dev @types/d3
```

Expected:

```text
added packages, audited packages
found 0 vulnerabilities
```

Accept npm's exact installed versions in `packages/viewer/package.json` and `package-lock.json`.

- [ ] **Step 2: Write failing core coercion test**

Add this test inside `packages/core/src/core.test.ts` near the existing advanced component/property tests:

```ts
test('coerces networkDiagram professional viewer options', () => {
  const doc = fromSketch(`
    screen "Network" 640x420
      network: networkDiagram at 0 0 640 420
        theme "obsidian"
        showControls true
        showSearch true
        showFilters true
        showLegend true
        enableDrag true
        enableZoom true
        enablePan true
        enableHover true
        selectedColor "#f8fafc"
        neighborColor "#60a5fa"
        mutedOpacity 0.18
        clusterColors ["#60a5fa","#34d399"]
        panelBackground "#111827"
        nodes [{"id":"a","label":"A"}]
        edges [{"from":"a","to":"b"}]
  `);

  const network = getByPath(doc, 'components.network');
  expect(network).toBeInstanceOf(XconObject);
  if (!(network instanceof XconObject)) throw new Error('network not parsed');

  expect(network.get('theme')).toBe('obsidian');
  expect(network.get('showControls')).toBe(true);
  expect(network.get('showSearch')).toBe(true);
  expect(network.get('showFilters')).toBe(true);
  expect(network.get('showLegend')).toBe(true);
  expect(network.get('enableDrag')).toBe(true);
  expect(network.get('enableZoom')).toBe(true);
  expect(network.get('enablePan')).toBe(true);
  expect(network.get('enableHover')).toBe(true);
  expect(network.get('selectedColor')).toBe('#f8fafc');
  expect(network.get('neighborColor')).toBe('#60a5fa');
  expect(network.get('mutedOpacity')).toBe(0.18);
  expect(network.get('clusterColors')).toEqual(['#60a5fa', '#34d399']);
  expect(network.get('panelBackground')).toBe('#111827');
  expect(network.get('edges')).toEqual([{ from: 'a', to: 'b' }]);
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run -t "networkDiagram professional"
```

Expected before implementation: FAIL because one or more new properties are still strings instead of booleans, numbers, or arrays.

- [ ] **Step 4: Add property coercions**

In `packages/core/src/parser/property-types.ts`, update the general property sets and `networkDiagram` section with these entries:

```ts
// Add to stringProperties
'theme',
'selectedColor',
'neighborColor',
'panelBackground',

// Add to numberProperties
'mutedOpacity',

// Add to booleanProperties
'showControls',
'showSearch',
'showFilters',
'showLegend',
'enableDrag',
'enableZoom',
'enablePan',
'enableHover',

// Add to jsonProperties
'clusterColors',
'edges',
```

Then make sure the `componentPropertyTypes.networkDiagram` object includes:

```ts
networkDiagram: {
  nodeRadius: 'number',
  linkDistance: 'number',
  charge: 'number',
  friction: 'number',
  gravity: 'number',
  nodes: 'json',
  links: 'json',
  edges: 'json',
  clusterColors: 'json',
  showLabels: 'boolean',
  showArrows: 'boolean',
  showControls: 'boolean',
  showSearch: 'boolean',
  showFilters: 'boolean',
  showLegend: 'boolean',
  enableDrag: 'boolean',
  enableZoom: 'boolean',
  enablePan: 'boolean',
  enableHover: 'boolean',
  mutedOpacity: 'number',
  theme: 'string',
  selectedColor: 'string',
  neighborColor: 'string',
  panelBackground: 'string',
},
```

- [ ] **Step 5: Run core targeted test**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run -t "networkDiagram professional"
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/core/src/parser/property-types.ts packages/core/src/core.test.ts packages/viewer/package.json package-lock.json
git commit -m "feat(viewer): add d3 network dependencies"
```

Expected: commit succeeds with only the files above staged.

## Task 2: Add Network Types And Data Normalization

**Files:**
- Create: `packages/viewer/src/renderer/network/types.ts`
- Create: `packages/viewer/src/renderer/network/data.ts`
- Create: `packages/viewer/src/renderer/network/data.test.ts`

- [ ] **Step 1: Write failing data normalization tests**

Create `packages/viewer/src/renderer/network/data.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { normalizeNetworkGraph } from './data';

describe('normalizeNetworkGraph', () => {
  test('normalizes public nodes and links with edges alias', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      rootNodeId: 'root',
      nodes: [
        { id: 'root', label: 'Root', group: 'core', x: 10, y: 20, color: '#60a5fa', metadata: { degree: 3 } },
        { id: 'child', name: 'Child', type: 'note' },
      ],
      edges: [{ from: 'root', to: 'child', type: 'ref', weight: 2 }],
    });

    expect(graph.rootNodeId).toBe('root');
    expect(graph.nodes).toEqual([
      {
        id: 'root',
        label: 'Root',
        type: undefined,
        group: 'core',
        color: '#60a5fa',
        icon: undefined,
        metadata: { degree: 3 },
        x: 10,
        y: 20,
        fixed: undefined,
        parentId: undefined,
        isRoot: true,
      },
      {
        id: 'child',
        label: 'Child',
        type: 'note',
        group: undefined,
        color: undefined,
        icon: undefined,
        metadata: {},
        x: undefined,
        y: undefined,
        fixed: undefined,
        parentId: undefined,
        isRoot: false,
      },
    ]);
    expect(graph.links).toEqual([
      {
        id: 'root->child',
        source: 'root',
        target: 'child',
        type: 'ref',
        label: undefined,
        weight: 2,
        metadata: {},
      },
    ]);
  });

  test('normalizes full-version data list with infos names and subfolders', () => {
    const graph = normalizeNetworkGraph({
      type: 'networkDiagram',
      data: {
        names: { root: 'ROOT:Vault', folderA: 'Projects', noteA: 'Launch Plan' },
        infos: { root: { color: '#8b5cf6', cid: 'r1' }, noteA: { tid: 'note' } },
        list: { root: ['folderA'], folderA: ['noteA'], noteA: [] },
        subfolders: {
          folderA: {
            objects: { noteB: 'Hidden Note' },
            infos: { noteB: { tid: 'note' } },
            lists: { noteB: [] },
          },
        },
      },
    });

    expect(graph.rootNodeId).toBe('root');
    expect(graph.nodes.map((node) => node.id)).toEqual(['root', 'folderA', 'noteA']);
    expect(graph.nodes.find((node) => node.id === 'root')).toMatchObject({
      label: 'Vault',
      isRoot: true,
      metadata: { color: '#8b5cf6', cid: 'r1' },
    });
    expect(graph.links.map((link) => `${link.source}->${link.target}`)).toEqual(['root->folderA', 'folderA->noteA']);
    expect(graph.subfolders.folderA.nodes).toEqual([
      {
        id: 'noteB',
        label: 'Hidden Note',
        type: 'node',
        group: undefined,
        color: undefined,
        icon: undefined,
        metadata: { tid: 'note' },
        x: undefined,
        y: undefined,
        fixed: undefined,
        parentId: 'folderA',
        isRoot: false,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/data.test.ts
```

Expected: FAIL with module not found for `./data`.

- [ ] **Step 3: Create shared network types**

Create `packages/viewer/src/renderer/network/types.ts`:

```ts
export interface NetworkGraphModel {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: NetworkGroup[];
  rootNodeId?: string;
  subfolders: Record<string, NetworkSubfolder>;
}

export interface NetworkNode {
  id: string;
  label: string;
  type?: string;
  group?: string;
  color?: string;
  icon?: string;
  metadata: Record<string, unknown>;
  x?: number;
  y?: number;
  fixed?: boolean;
  parentId?: string;
  isRoot: boolean;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  weight?: number;
  metadata: Record<string, unknown>;
}

export interface NetworkGroup {
  id: string;
  label: string;
  color?: string;
  metadata: Record<string, unknown>;
}

export interface NetworkSubfolder {
  parentId: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
}
```

- [ ] **Step 4: Implement data normalization**

Create `packages/viewer/src/renderer/network/data.ts`:

```ts
import { isXconObject, type XconValue } from '@xcon-viewer/core';
import type { NetworkGraphModel, NetworkLink, NetworkNode, NetworkSubfolder } from './types';

type PlainRecord = Record<string, unknown>;

export function toNetworkPlainValue(value: unknown): unknown {
  if (isXconObject(value)) {
    const result: PlainRecord = {};
    value.forEach((child: XconValue, key: string) => {
      result[key] = toNetworkPlainValue(child);
    });
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => toNetworkPlainValue(item));
  return value;
}

export function normalizeNetworkGraph(input: unknown): NetworkGraphModel {
  const component = asRecord(toNetworkPlainValue(input)) ?? {};
  const fullData = asRecord(component.data);
  const rootNodeId = stringValue(component.rootNodeId) ?? rootFromFullData(fullData);

  if (fullData && asRecord(fullData.list)) {
    return normalizeFullData(fullData, rootNodeId);
  }

  const nodes = arrayValue(component.nodes).map((item, index) => normalizeNode(item, index, rootNodeId));
  const links = arrayValue(component.links ?? component.edges).flatMap((item, index) => normalizeLink(item, index));
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const filteredLinks = links.filter((link) => knownNodeIds.has(link.source) && knownNodeIds.has(link.target));

  return {
    nodes: nodes.length ? nodes : [normalizeNode({ id: 'root', label: 'Root' }, 0, 'root')],
    links: filteredLinks,
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: {},
  };
}

function normalizeFullData(data: PlainRecord, explicitRootId?: string): NetworkGraphModel {
  const list = asRecord(data.list) ?? {};
  const names = asRecord(data.names) ?? {};
  const infos = asRecord(data.infos) ?? {};
  const ids = Object.keys(list);
  const rootNodeId = explicitRootId ?? rootFromFullData(data) ?? ids[0];
  const nodes = ids.map((id, index) => {
    const rawName = stringValue(names[id]) ?? id;
    const isRoot = id === rootNodeId || rawName.startsWith('ROOT:');
    const label = rawName.startsWith('ROOT:') ? rawName.slice(5) : rawName;
    const metadata = asRecord(infos[id]) ?? {};
    return normalizeNode(
      {
        id,
        label,
        type: id.startsWith('A') ? 'folder' : 'node',
        color: metadata.color,
        icon: metadata.icon,
        metadata,
        isRoot,
      },
      index,
      rootNodeId,
    );
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links: NetworkLink[] = [];
  for (const [source, targets] of Object.entries(list)) {
    for (const target of arrayValue(targets)) {
      const targetId = String(target);
      if (source !== targetId && nodeIds.has(source) && nodeIds.has(targetId)) {
        links.push({
          id: `${source}->${targetId}`,
          source,
          target: targetId,
          type: source.startsWith('A') ? 'folder' : undefined,
          label: undefined,
          weight: undefined,
          metadata: {},
        });
      }
    }
  }
  return {
    nodes,
    links,
    groups: collectGroups(nodes),
    rootNodeId,
    subfolders: normalizeSubfolders(data.subfolders, rootNodeId),
  };
}

function normalizeSubfolders(value: unknown, rootNodeId?: string): Record<string, NetworkSubfolder> {
  const raw = asRecord(value);
  if (!raw) return {};
  const result: Record<string, NetworkSubfolder> = {};
  for (const [parentId, subfolderValue] of Object.entries(raw)) {
    const subfolder = asRecord(subfolderValue) ?? {};
    const names = asRecord(subfolder.objects) ?? asRecord(subfolder.names) ?? {};
    const infos = asRecord(subfolder.infos) ?? {};
    const lists = asRecord(subfolder.lists) ?? asRecord(subfolder.list) ?? {};
    const nodeIds = Object.keys(lists);
    const nodes = nodeIds.map((id, index) =>
      normalizeNode(
        {
          id,
          label: stringValue(names[id]) ?? id,
          type: 'node',
          color: asRecord(infos[id])?.color,
          icon: asRecord(infos[id])?.icon,
          metadata: asRecord(infos[id]) ?? {},
          parentId,
        },
        index,
        rootNodeId,
      ),
    );
    const validIds = new Set(nodes.map((node) => node.id));
    const links: NetworkLink[] = [];
    for (const [source, targets] of Object.entries(lists)) {
      for (const target of arrayValue(targets)) {
        const targetId = String(target);
        if (source !== targetId && validIds.has(source) && validIds.has(targetId)) {
          links.push({ id: `${source}->${targetId}`, source, target: targetId, type: undefined, label: undefined, weight: undefined, metadata: {} });
        }
      }
    }
    result[parentId] = { parentId, nodes, links };
  }
  return result;
}

function normalizeNode(item: unknown, index: number, rootNodeId?: string): NetworkNode {
  const record = asRecord(item) ?? {};
  const id = stringValue(record.id) ?? String(index);
  const metadata = asRecord(record.metadata) ?? {};
  return {
    id,
    label: stringValue(record.label) ?? stringValue(record.name) ?? stringValue(record.title) ?? id,
    type: stringValue(record.type),
    group: stringValue(record.group),
    color: stringValue(record.color),
    icon: stringValue(record.icon),
    metadata,
    x: numberValue(record.x),
    y: numberValue(record.y),
    fixed: booleanValue(record.fixed),
    parentId: stringValue(record.parentId),
    isRoot: booleanValue(record.isRoot) ?? (rootNodeId ? id === rootNodeId : index === 0),
  };
}

function normalizeLink(item: unknown, index: number): NetworkLink[] {
  const record = asRecord(item);
  if (!record) return [];
  const source = stringValue(record.source) ?? stringValue(record.from);
  const target = stringValue(record.target) ?? stringValue(record.to);
  if (!source || !target) return [];
  return [
    {
      id: stringValue(record.id) ?? `${source}->${target}`,
      source,
      target,
      type: stringValue(record.type),
      label: stringValue(record.label),
      weight: numberValue(record.weight),
      metadata: asRecord(record.metadata) ?? {},
    },
  ];
}

function collectGroups(nodes: NetworkNode[]) {
  const groups = new Map<string, { id: string; label: string; color?: string; metadata: Record<string, unknown> }>();
  for (const node of nodes) {
    if (!node.group) continue;
    if (!groups.has(node.group)) groups.set(node.group, { id: node.group, label: node.group, metadata: {} });
  }
  return [...groups.values()];
}

function rootFromFullData(data: PlainRecord | null | undefined): string | undefined {
  if (!data) return undefined;
  const names = asRecord(data.names) ?? {};
  for (const [id, name] of Object.entries(names)) {
    if (String(name).startsWith('ROOT:')) return id;
  }
  return undefined;
}

function asRecord(value: unknown): PlainRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PlainRecord) : undefined;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function numberValue(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === false || value === 'false' || value === '0') return false;
  return true;
}
```

- [ ] **Step 5: Run data tests**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/data.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/viewer/src/renderer/network/types.ts packages/viewer/src/renderer/network/data.ts packages/viewer/src/renderer/network/data.test.ts
git commit -m "feat(viewer): normalize network graph data"
```

Expected: commit succeeds.

## Task 3: Add Theme Resolution

**Files:**
- Create: `packages/viewer/src/renderer/network/theme.ts`
- Create: `packages/viewer/src/renderer/network/theme.test.ts`
- Modify: `packages/viewer/src/renderer/network/types.ts`

- [ ] **Step 1: Extend types**

Add to `packages/viewer/src/renderer/network/types.ts`:

```ts
export type NetworkThemeName = 'obsidian' | 'light' | 'auto' | 'custom';

export interface NetworkTheme {
  name: Exclude<NetworkThemeName, 'auto'>;
  backgroundColor: string;
  nodeColor: string;
  linkColor: string;
  refLinkColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  selectedColor: string;
  neighborColor: string;
  mutedOpacity: number;
  panelBackground: string;
  clusterColors: string[];
}
```

- [ ] **Step 2: Write failing theme tests**

Create `packages/viewer/src/renderer/network/theme.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { networkThemeStyle, resolveNetworkTheme } from './theme';

describe('resolveNetworkTheme', () => {
  test('defaults to obsidian', () => {
    const theme = resolveNetworkTheme({});
    expect(theme).toMatchObject({
      name: 'obsidian',
      backgroundColor: '#11131a',
      textColor: '#d8dee9',
      mutedOpacity: 0.18,
    });
  });

  test('supports light theme', () => {
    const theme = resolveNetworkTheme({ theme: 'light' });
    expect(theme.name).toBe('light');
    expect(theme.backgroundColor).toBe('#f8fafc');
    expect(theme.textColor).toBe('#0f172a');
  });

  test('auto chooses light for bright backgrounds and obsidian for dark backgrounds', () => {
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#ffffff' }).name).toBe('light');
    expect(resolveNetworkTheme({ theme: 'auto', backgroundColor: '#101820' }).name).toBe('obsidian');
  });

  test('custom tokens override defaults', () => {
    const theme = resolveNetworkTheme({
      theme: 'custom',
      backgroundColor: '#000000',
      selectedColor: '#ff00aa',
      clusterColors: ['#111111', '#222222'],
      mutedOpacity: 0.25,
    });
    expect(theme.name).toBe('custom');
    expect(theme.backgroundColor).toBe('#000000');
    expect(theme.selectedColor).toBe('#ff00aa');
    expect(theme.clusterColors).toEqual(['#111111', '#222222']);
    expect(theme.mutedOpacity).toBe(0.25);
  });
});

describe('networkThemeStyle', () => {
  test('emits safe CSS custom properties', () => {
    const style = networkThemeStyle(resolveNetworkTheme({ theme: 'obsidian' }));
    expect(style).toContain('--xcon-network-bg:#11131a');
    expect(style).toContain('--xcon-network-text:#d8dee9');
    expect(style).not.toContain('javascript:');
    expect(style).not.toContain('url(');
  });
});
```

- [ ] **Step 3: Run test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/theme.test.ts
```

Expected: FAIL with module not found for `./theme`.

- [ ] **Step 4: Implement theme resolver**

Create `packages/viewer/src/renderer/network/theme.ts`:

```ts
import type { NetworkTheme, NetworkThemeName } from './types';

const obsidianTheme: NetworkTheme = {
  name: 'obsidian',
  backgroundColor: '#11131a',
  nodeColor: '#8b5cf6',
  linkColor: '#455066',
  refLinkColor: '#64748b',
  primaryColor: '#8b5cf6',
  accentColor: '#60a5fa',
  textColor: '#d8dee9',
  selectedColor: '#f8fafc',
  neighborColor: '#60a5fa',
  mutedOpacity: 0.18,
  panelBackground: '#1b2030',
  clusterColors: ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6'],
};

const lightTheme: NetworkTheme = {
  name: 'light',
  backgroundColor: '#f8fafc',
  nodeColor: '#2563eb',
  linkColor: '#cbd5e1',
  refLinkColor: '#94a3b8',
  primaryColor: '#2563eb',
  accentColor: '#db2777',
  textColor: '#0f172a',
  selectedColor: '#111827',
  neighborColor: '#2563eb',
  mutedOpacity: 0.22,
  panelBackground: '#ffffff',
  clusterColors: ['#2563eb', '#14b8a6', '#8b5cf6', '#f97316', '#10b981', '#db2777'],
};

export function resolveNetworkTheme(input: Record<string, unknown>): NetworkTheme {
  const requested = String(input.theme ?? 'obsidian').trim().toLowerCase() as NetworkThemeName;
  const base = requested === 'light' ? lightTheme : requested === 'auto' ? autoBase(input.backgroundColor) : requested === 'custom' ? obsidianTheme : obsidianTheme;
  return {
    ...base,
    name: requested === 'custom' ? 'custom' : base.name,
    backgroundColor: color(input.backgroundColor) ?? base.backgroundColor,
    nodeColor: color(input.nodeColor) ?? base.nodeColor,
    linkColor: color(input.linkColor) ?? base.linkColor,
    refLinkColor: color(input.refLinkColor) ?? base.refLinkColor,
    primaryColor: color(input.primaryColor) ?? base.primaryColor,
    accentColor: color(input.accentColor) ?? base.accentColor,
    textColor: color(input.textColor) ?? base.textColor,
    selectedColor: color(input.selectedColor) ?? base.selectedColor,
    neighborColor: color(input.neighborColor) ?? base.neighborColor,
    mutedOpacity: opacity(input.mutedOpacity) ?? base.mutedOpacity,
    panelBackground: color(input.panelBackground) ?? base.panelBackground,
    clusterColors: colors(input.clusterColors) ?? base.clusterColors,
  };
}

export function networkThemeStyle(theme: NetworkTheme): string {
  const vars = {
    '--xcon-network-bg': theme.backgroundColor,
    '--xcon-network-node': theme.nodeColor,
    '--xcon-network-link': theme.linkColor,
    '--xcon-network-ref-link': theme.refLinkColor,
    '--xcon-network-primary': theme.primaryColor,
    '--xcon-network-accent': theme.accentColor,
    '--xcon-network-text': theme.textColor,
    '--xcon-network-selected': theme.selectedColor,
    '--xcon-network-neighbor': theme.neighborColor,
    '--xcon-network-muted-opacity': String(theme.mutedOpacity),
    '--xcon-network-panel': theme.panelBackground,
  };
  return Object.entries(vars).map(([key, value]) => `${key}:${safeCssValue(value)}`).join(';');
}

function autoBase(background: unknown): NetworkTheme {
  const text = color(background);
  if (!text) return obsidianTheme;
  const luminance = hexLuminance(text);
  return luminance !== undefined && luminance > 0.5 ? lightTheme : obsidianTheme;
}

function color(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(trimmed)) return trimmed;
  if (/^[a-z]+$/i.test(trimmed)) return trimmed;
  if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(trimmed)) return trimmed;
  return undefined;
}

function colors(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.map((item) => color(item)).filter((item): item is string => Boolean(item));
  return parsed.length ? parsed : undefined;
}

function opacity(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(1, numeric));
}

function hexLuminance(hex: string): number | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return undefined;
  const raw = match[1].length === 3 ? match[1].split('').map((part) => part + part).join('') : match[1];
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function safeCssValue(value: string): string {
  if (/javascript:|vbscript:|expression\(|url\(/i.test(value)) return '';
  return value;
}
```

- [ ] **Step 5: Run theme tests**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/theme.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/viewer/src/renderer/network/types.ts packages/viewer/src/renderer/network/theme.ts packages/viewer/src/renderer/network/theme.test.ts
git commit -m "feat(viewer): add network theme resolver"
```

Expected: commit succeeds.

## Task 4: Extract Static Fallback Renderer

**Files:**
- Create: `packages/viewer/src/renderer/network/static.ts`
- Create: `packages/viewer/src/renderer/network/static.test.ts`
- Modify: `packages/viewer/src/renderer/index.ts`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Write failing static tests**

Create `packages/viewer/src/renderer/network/static.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { renderNetworkStatic } from './static';

describe('renderNetworkStatic', () => {
  test('renders obsidian fallback with serialized model data', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        theme: 'obsidian',
        nodes: [
          { id: 'root', label: 'Root' },
          { id: 'child', label: 'Child <script>' },
        ],
        links: [{ source: 'root', target: 'child', type: 'ref' }],
      },
      attrs: { 'data-xcon-type': 'networkDiagram', style: 'position:absolute;width:420px;height:260px' },
    });

    expect(html).toContain('class="xa-network-diagram-container"');
    expect(html).toContain('data-xcon-network="true"');
    expect(html).toContain('data-xcon-network-model=');
    expect(html).toContain('data-xcon-network-theme="obsidian"');
    expect(html).toContain('id="network-diagram-root"');
    expect(html).toContain('Root');
    expect(html).toContain('Child &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('keeps arrows and labels configurable', () => {
    const html = renderNetworkStatic({
      key: 'root',
      component: {
        showLabels: false,
        showArrows: false,
        nodeRadius: 32,
        nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B', color: '#ff00aa' }],
        edges: [{ from: 'a', to: 'b', type: 'folder' }],
      },
      attrs: {},
    });

    expect(html).toContain('r="32"');
    expect(html).toContain('fill="#ff00aa"');
    expect(html).not.toContain('class="network-label"');
    expect(html).not.toContain('marker-end=');
  });
});
```

- [ ] **Step 2: Run static test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/static.test.ts
```

Expected: FAIL with module not found for `./static`.

- [ ] **Step 3: Implement static renderer**

Create `packages/viewer/src/renderer/network/static.ts` with these exports and behavior:

```ts
import { normalizeNetworkGraph, toNetworkPlainValue } from './data';
import { networkThemeStyle, resolveNetworkTheme } from './theme';
import type { NetworkGraphModel, NetworkNode } from './types';

export interface RenderNetworkStaticInput {
  key: string;
  component: unknown;
  attrs: Record<string, string | undefined>;
}

export function renderNetworkStatic(input: RenderNetworkStaticInput): string {
  const component = toNetworkPlainValue(input.component) as Record<string, unknown>;
  const graph = normalizeNetworkGraph(component);
  const theme = resolveNetworkTheme(component);
  const key = sanitizeKey(input.key);
  const nodeRadius = Math.max(1, Number(component.nodeRadius ?? 25) || 25);
  const showLabels = booleanOption(component.showLabels, true);
  const showArrows = booleanOption(component.showArrows, true);
  const style = joinStyles(
    input.attrs.style,
    `width:100%;height:100%;background:${theme.backgroundColor}`,
    networkThemeStyle(theme),
  );
  const hostAttrs = {
    ...input.attrs,
    class: className(input.attrs.class, 'xa-network-diagram-container'),
    id: `network-container-${key}`,
    style,
    'data-key': key,
    'data-xcon-network': 'true',
    'data-xcon-network-bound': 'false',
    'data-xcon-network-theme': theme.name,
    'data-xcon-network-model': jsonAttr(graph),
    'data-xcon-network-options': jsonAttr(networkOptions(component)),
  };
  return tag(
    'div',
    hostAttrs,
    tag('div', { class: 'xa-network-toolbar', 'data-xcon-network-toolbar': 'true' }, '') +
      tag('svg', { id: `network-diagram-${key}`, class: 'network-svg', style: 'width:100%;height:100%;', viewBox: '0 0 800 600', role: 'img' }, renderStaticSvg(graph, key, nodeRadius, showLabels, showArrows, theme)) +
      tag('div', { class: 'network-tooltip', 'data-xcon-network-tooltip': 'true' }, ''),
  );
}

function renderStaticSvg(graph: NetworkGraphModel, key: string, nodeRadius: number, showLabels: boolean, showArrows: boolean, theme: ReturnType<typeof resolveNetworkTheme>): string {
  const positions = fallbackPositions(graph.nodes);
  const defs = showArrows
    ? tag(
        'defs',
        {},
        tag('marker', { id: `arrow-${key}`, viewBox: '0 -5 10 10', refX: '10', refY: '0', markerWidth: '5', markerHeight: '5', orient: 'auto' }, tag('path', { d: 'M0,-5L10,0L0,5', class: 'network-arrow', fill: theme.linkColor }, '')) +
          tag('marker', { id: `ref-arrow-${key}`, viewBox: '0 -5 10 10', refX: '10', refY: '0', markerWidth: '5', markerHeight: '5', orient: 'auto' }, tag('path', { d: 'M0,-5L10,0L0,5', class: 'network-arrow ref-arrow', fill: theme.refLinkColor }, '')),
      )
    : '';
  const links = graph.links
    .map((link) => {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) return '';
      const ref = link.type === 'folder' || link.type === 'ref';
      return tag(
        'line',
        {
          class: `network-link${ref ? ' ref-link' : ''}`,
          x1: String(source.x),
          y1: String(source.y),
          x2: String(target.x),
          y2: String(target.y),
          stroke: ref ? theme.refLinkColor : theme.linkColor,
          'marker-end': showArrows ? `url(#${ref ? 'ref-arrow' : 'arrow'}-${key})` : undefined,
        },
        '',
      );
    })
    .join('');
  const nodes = graph.nodes
    .map((node, index) => {
      const point = positions.get(node.id) ?? { x: 400, y: 300 };
      return tag(
        'g',
        { class: `network-node-group${node.isRoot || index === 0 ? ' root-node' : ''}`, 'data-node-id': node.id },
        tag('circle', { class: `network-node${node.isRoot || index === 0 ? ' root-node' : ''}`, cx: String(point.x), cy: String(point.y), r: String(nodeRadius), fill: node.color ?? (node.isRoot || index === 0 ? theme.primaryColor : theme.nodeColor) }, '') +
          (showLabels ? tag('text', { class: `network-label${node.isRoot || index === 0 ? ' root-label' : ''}`, x: String(point.x), y: String(point.y + nodeRadius + 19), 'text-anchor': 'middle', fill: theme.textColor }, escapeHtml(node.label)) : ''),
      );
    })
    .join('');
  return defs + links + nodes;
}

function fallbackPositions(nodes: NetworkNode[]): Map<string, { x: number; y: number }> {
  const items = nodes.length ? nodes : [{ id: 'root', label: 'Root', metadata: {}, isRoot: true }];
  return new Map(
    items.map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, items.length);
      return [node.id, { x: node.x ?? 400 + Math.cos(angle) * 190, y: node.y ?? 300 + Math.sin(angle) * 150 }];
    }),
  );
}

function networkOptions(component: Record<string, unknown>) {
  return {
    nodeRadius: Math.max(1, Number(component.nodeRadius ?? 25) || 25),
    linkDistance: Number(component.linkDistance ?? 80) || 80,
    charge: Number(component.charge ?? -1500) || -1500,
    friction: Number(component.friction ?? 0.75) || 0.75,
    gravity: Number(component.gravity ?? 0.08) || 0.08,
    showLabels: booleanOption(component.showLabels, true),
    showArrows: booleanOption(component.showArrows, true),
    showControls: booleanOption(component.showControls, true),
    showSearch: booleanOption(component.showSearch, true),
    showFilters: booleanOption(component.showFilters, true),
    showLegend: booleanOption(component.showLegend, true),
    enableDrag: booleanOption(component.enableDrag, true),
    enableZoom: booleanOption(component.enableZoom, true),
    enablePan: booleanOption(component.enablePan, true),
    enableHover: booleanOption(component.enableHover, true),
  };
}

function booleanOption(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  return !(value === false || value === 'false' || value === '0');
}

function sanitizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-') || 'root';
}

function joinStyles(...styles: Array<string | undefined>): string {
  return styles.filter(Boolean).join(';').replaceAll(/;+/g, ';').replace(/^;|;$/g, '');
}

function className(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function jsonAttr(value: unknown): string {
  return escapeAttr(JSON.stringify(value));
}

function tag(name: string, attrs: Record<string, string | undefined>, body: string): string {
  return `<${name}${renderAttrs(attrs)}>${body}</${name}>`;
}

function renderAttrs(attrs: Record<string, string | undefined>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => ` ${name}="${escapeAttr(String(value))}"`)
    .join('');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
```

- [ ] **Step 4: Wire renderer to static renderer**

In `packages/viewer/src/renderer/index.ts`, add:

```ts
import { renderNetworkStatic } from './network/static';
```

Change the `networkDiagram` case to pass context:

```ts
case 'networkDiagram':
  return renderAdvancedNetworkDiagram(component, attrs);
```

Replace the body of `renderAdvancedNetworkDiagram` with:

```ts
function renderAdvancedNetworkDiagram(component: XconObject, attrs: Record<string, string | undefined>): string {
  const key = componentDomKey(attrs);
  return renderNetworkStatic({ key, component, attrs: advancedAttrs(attrs, '', key, '') });
}
```

Leave the old `renderStaticNetwork()` helper temporarily if other code still references it; remove it after tests confirm it is unused.

- [ ] **Step 5: Update renderer integration tests**

In `packages/viewer/src/renderer/renderer.test.ts`, update the existing network expectations:

```ts
expect(network).toContain('data-xcon-network="true"');
expect(network).toContain('data-xcon-network-theme="obsidian"');
expect(network).toContain('data-xcon-network-model=');
```

In the visual options test, update the expected background from the old gradient to the new theme style:

```ts
expect(html).toContain('--xcon-network-bg:#101820');
expect(html).toContain('stroke="#556677"');
expect(html).toContain('r="32"');
expect(html).toContain('fill="#ff00aa"');
expect(html).not.toContain('class="network-label"');
expect(html).not.toContain('marker-end=');
```

- [ ] **Step 6: Run static and renderer tests**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/static.test.ts -t "renderNetworkStatic"
npm --workspace @xcon-viewer/viewer test -- --run -t network
```

Expected: PASS for both commands.

- [ ] **Step 7: Commit**

Run:

```powershell
git add packages/viewer/src/renderer/network/static.ts packages/viewer/src/renderer/network/static.test.ts packages/viewer/src/renderer/index.ts packages/viewer/src/renderer/renderer.test.ts
git commit -m "feat(viewer): render network fallback from normalized model"
```

Expected: commit succeeds.

## Task 5: Add Pure Network State Helpers

**Files:**
- Create: `packages/viewer/src/renderer/network/state.ts`
- Create: `packages/viewer/src/renderer/network/state.test.ts`
- Modify: `packages/viewer/src/renderer/network/types.ts`

- [ ] **Step 1: Extend types for state**

Add to `packages/viewer/src/renderer/network/types.ts`:

```ts
export interface NetworkViewState {
  selectedNodeId?: string;
  search: string;
  expandedFolderIds: Set<string>;
  enabledGroups: Set<string>;
  enabledLinkTypes: Set<string>;
  minDegree: number;
}

export interface NetworkVisibleModel {
  nodes: NetworkNode[];
  links: NetworkLink[];
  highlightedNodeIds: Set<string>;
  highlightedLinkIds: Set<string>;
  mutedNodeIds: Set<string>;
  mutedLinkIds: Set<string>;
}
```

- [ ] **Step 2: Write failing state tests**

Create `packages/viewer/src/renderer/network/state.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { createNetworkState, expandFolder, selectNode, visibleNetworkModel } from './state';
import type { NetworkGraphModel } from './types';

const graph: NetworkGraphModel = {
  rootNodeId: 'root',
  nodes: [
    { id: 'root', label: 'Root', group: 'core', metadata: {}, isRoot: true },
    { id: 'a', label: 'Alpha', group: 'core', metadata: {}, isRoot: false },
    { id: 'b', label: 'Beta', group: 'docs', metadata: {}, isRoot: false },
  ],
  links: [
    { id: 'root->a', source: 'root', target: 'a', type: 'ref', metadata: {} },
    { id: 'a->b', source: 'a', target: 'b', type: 'normal', metadata: {} },
  ],
  groups: [
    { id: 'core', label: 'core', metadata: {} },
    { id: 'docs', label: 'docs', metadata: {} },
  ],
  subfolders: {
    a: {
      parentId: 'a',
      nodes: [{ id: 'c', label: 'Child', parentId: 'a', metadata: {}, isRoot: false }],
      links: [{ id: 'a->c', source: 'a', target: 'c', type: 'folder', metadata: {} }],
    },
  },
};

describe('network state', () => {
  test('selects node and highlights neighbors', () => {
    const state = selectNode(createNetworkState(graph), 'a');
    const visible = visibleNetworkModel(graph, state);
    expect(visible.highlightedNodeIds).toEqual(new Set(['root', 'a', 'b']));
    expect(visible.highlightedLinkIds).toEqual(new Set(['root->a', 'a->b']));
  });

  test('search filters visible nodes by label', () => {
    const state = { ...createNetworkState(graph), search: 'beta' };
    const visible = visibleNetworkModel(graph, state);
    expect(visible.nodes.map((node) => node.id)).toEqual(['b']);
    expect(visible.links).toEqual([]);
  });

  test('group filter removes disabled groups', () => {
    const state = createNetworkState(graph);
    state.enabledGroups = new Set(['core']);
    const visible = visibleNetworkModel(graph, state);
    expect(visible.nodes.map((node) => node.id)).toEqual(['root', 'a']);
    expect(visible.links.map((link) => link.id)).toEqual(['root->a']);
  });

  test('folder expansion adds child nodes and links locally', () => {
    const state = expandFolder(createNetworkState(graph), 'a');
    const visible = visibleNetworkModel(graph, state);
    expect(visible.nodes.map((node) => node.id)).toEqual(['root', 'a', 'b', 'c']);
    expect(visible.links.map((link) => link.id)).toEqual(['root->a', 'a->b', 'a->c']);
  });
});
```

- [ ] **Step 3: Run state tests and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/state.test.ts
```

Expected: FAIL with module not found for `./state`.

- [ ] **Step 4: Implement state helpers**

Create `packages/viewer/src/renderer/network/state.ts`:

```ts
import type { NetworkGraphModel, NetworkLink, NetworkNode, NetworkViewState, NetworkVisibleModel } from './types';

export function createNetworkState(graph: NetworkGraphModel): NetworkViewState {
  return {
    selectedNodeId: undefined,
    search: '',
    expandedFolderIds: new Set<string>(),
    enabledGroups: new Set(graph.groups.map((group) => group.id)),
    enabledLinkTypes: new Set(graph.links.map((link) => link.type ?? 'normal')),
    minDegree: 0,
  };
}

export function selectNode(state: NetworkViewState, nodeId: string | undefined): NetworkViewState {
  return { ...state, selectedNodeId: nodeId };
}

export function expandFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  const next = new Set(state.expandedFolderIds);
  next.add(folderId);
  return { ...state, expandedFolderIds: next };
}

export function collapseFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  const next = new Set(state.expandedFolderIds);
  next.delete(folderId);
  return { ...state, expandedFolderIds: next };
}

export function toggleFolder(state: NetworkViewState, folderId: string): NetworkViewState {
  return state.expandedFolderIds.has(folderId) ? collapseFolder(state, folderId) : expandFolder(state, folderId);
}

export function visibleNetworkModel(graph: NetworkGraphModel, state: NetworkViewState): NetworkVisibleModel {
  const expanded = expandedGraph(graph, state);
  const degree = degreeMap(expanded.links);
  const query = state.search.trim().toLowerCase();
  const nodes = expanded.nodes.filter((node) => {
    if (query && !node.label.toLowerCase().includes(query) && !node.id.toLowerCase().includes(query)) return false;
    if (state.enabledGroups.size > 0 && node.group && !state.enabledGroups.has(node.group)) return false;
    if ((degree.get(node.id) ?? 0) < state.minDegree) return false;
    return true;
  });
  const visibleIds = new Set(nodes.map((node) => node.id));
  const links = expanded.links.filter((link) => {
    if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) return false;
    return state.enabledLinkTypes.size === 0 || state.enabledLinkTypes.has(link.type ?? 'normal');
  });
  const { highlightedNodeIds, highlightedLinkIds } = highlightSets(state.selectedNodeId, links);
  const mutedNodeIds = state.selectedNodeId ? new Set(nodes.filter((node) => !highlightedNodeIds.has(node.id)).map((node) => node.id)) : new Set<string>();
  const mutedLinkIds = state.selectedNodeId ? new Set(links.filter((link) => !highlightedLinkIds.has(link.id)).map((link) => link.id)) : new Set<string>();
  return { nodes, links, highlightedNodeIds, highlightedLinkIds, mutedNodeIds, mutedLinkIds };
}

function expandedGraph(graph: NetworkGraphModel, state: NetworkViewState): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes = [...graph.nodes];
  const links = [...graph.links];
  for (const folderId of state.expandedFolderIds) {
    const subfolder = graph.subfolders[folderId];
    if (!subfolder) continue;
    nodes.push(...subfolder.nodes);
    links.push(...subfolder.links);
  }
  return { nodes, links };
}

function degreeMap(links: NetworkLink[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const link of links) {
    result.set(link.source, (result.get(link.source) ?? 0) + 1);
    result.set(link.target, (result.get(link.target) ?? 0) + 1);
  }
  return result;
}

function highlightSets(selectedNodeId: string | undefined, links: NetworkLink[]): { highlightedNodeIds: Set<string>; highlightedLinkIds: Set<string> } {
  const highlightedNodeIds = new Set<string>();
  const highlightedLinkIds = new Set<string>();
  if (!selectedNodeId) return { highlightedNodeIds, highlightedLinkIds };
  highlightedNodeIds.add(selectedNodeId);
  for (const link of links) {
    if (link.source === selectedNodeId || link.target === selectedNodeId) {
      highlightedLinkIds.add(link.id);
      highlightedNodeIds.add(link.source);
      highlightedNodeIds.add(link.target);
    }
  }
  return { highlightedNodeIds, highlightedLinkIds };
}
```

- [ ] **Step 5: Run state tests**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/viewer/src/renderer/network/types.ts packages/viewer/src/renderer/network/state.ts packages/viewer/src/renderer/network/state.test.ts
git commit -m "feat(viewer): add network graph state helpers"
```

Expected: commit succeeds.

## Task 6: Add D3 Runtime Hydration

**Files:**
- Create: `packages/viewer/src/renderer/network/runtime.ts`
- Create: `packages/viewer/src/renderer/network/runtime.test.ts`
- Modify: `packages/viewer/src/renderer/index.ts`

- [ ] **Step 1: Write failing hydration tests**

Create `packages/viewer/src/renderer/network/runtime.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { hydrateNetworkDiagrams } from './runtime';

describe('hydrateNetworkDiagrams', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('marks network host as bound and preserves local-only behavior', () => {
    document.body.innerHTML = `
      <div class="xa-network-diagram-container"
        data-xcon-network="true"
        data-xcon-network-bound="false"
        data-xcon-network-model='{"nodes":[{"id":"a","label":"A","metadata":{},"isRoot":true},{"id":"b","label":"B","metadata":{},"isRoot":false}],"links":[{"id":"a->b","source":"a","target":"b","metadata":{}}],"groups":[],"subfolders":{}}'
        data-xcon-network-options='{"nodeRadius":25,"linkDistance":80,"charge":-1500,"friction":0.75,"showLabels":true,"showArrows":true,"showControls":true,"showSearch":true,"showFilters":true,"showLegend":true,"enableDrag":true,"enableZoom":true,"enablePan":true,"enableHover":true}'
      >
        <svg class="network-svg"></svg>
        <div class="network-tooltip"></div>
      </div>
    `;
    const listener = vi.fn();
    document.body.addEventListener('xcon-network-select', listener);

    hydrateNetworkDiagrams(document);

    const host = document.querySelector<HTMLElement>('[data-xcon-network]');
    expect(host?.dataset.xconNetworkBound).toBe('true');
    expect(host?.querySelector('[data-xcon-network-search]')).toBeTruthy();
    expect(host?.querySelector('[data-xcon-network-fit]')).toBeTruthy();
    host?.querySelector<SVGElement>('[data-network-node-id="a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host?.dataset.xconNetworkSelected).toBe('a');
    expect(listener).not.toHaveBeenCalled();
  });

  test('leaves static fallback in place when model data is invalid', () => {
    document.body.innerHTML = `<div data-xcon-network="true" data-xcon-network-model="not-json"><svg class="network-svg"><circle cx="1" cy="1" r="1"></circle></svg></div>`;
    hydrateNetworkDiagrams(document);
    expect(document.querySelector('circle')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run hydration test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/runtime.test.ts
```

Expected: FAIL with module not found for `./runtime`.

- [ ] **Step 3: Implement D3 runtime**

Create `packages/viewer/src/renderer/network/runtime.ts`:

```ts
import { drag, forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, select, zoom, zoomIdentity, type SimulationNodeDatum, type ZoomBehavior } from 'd3';
import { createNetworkState, selectNode, toggleFolder, visibleNetworkModel } from './state';
import type { NetworkGraphModel, NetworkLink, NetworkNode, NetworkViewState } from './types';

interface RuntimeNode extends NetworkNode, SimulationNodeDatum {}
interface RuntimeLink extends Omit<NetworkLink, 'source' | 'target'> {
  source: string | RuntimeNode;
  target: string | RuntimeNode;
}

interface NetworkRuntimeOptions {
  nodeRadius: number;
  linkDistance: number;
  charge: number;
  friction: number;
  showLabels: boolean;
  showArrows: boolean;
  showControls: boolean;
  showSearch: boolean;
  showFilters: boolean;
  showLegend: boolean;
  enableDrag: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  enableHover: boolean;
}

export function hydrateNetworkDiagrams(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-xcon-network="true"]').forEach((host) => {
    if (host.dataset.xconNetworkBound === 'true') return;
    const graph = parseJson<NetworkGraphModel>(host.dataset.xconNetworkModel);
    const options = parseJson<NetworkRuntimeOptions>(host.dataset.xconNetworkOptions);
    if (!graph || !options) return;
    host.dataset.xconNetworkBound = 'true';
    createNetworkRuntime(host, graph, options);
  });
}

function createNetworkRuntime(host: HTMLElement, graph: NetworkGraphModel, options: NetworkRuntimeOptions): void {
  let state = createNetworkState(graph);
  const svgElement = host.querySelector<SVGSVGElement>('svg.network-svg');
  if (!svgElement) return;
  const svg = select(svgElement);
  svg.selectAll('*').remove();
  const width = host.clientWidth || 800;
  const height = host.clientHeight || 600;
  svg.attr('viewBox', `0 0 ${width} ${height}`);
  renderControls(host, options, (nextState) => {
    state = nextState;
    render();
  }, () => state, graph);

  const rootGroup = svg.append('g').attr('class', 'network-runtime-group');
  const linkGroup = rootGroup.append('g').attr('class', 'network-runtime-links');
  const nodeGroup = rootGroup.append('g').attr('class', 'network-runtime-nodes');
  const labelGroup = rootGroup.append('g').attr('class', 'network-runtime-labels');
  let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | undefined;

  if (options.enableZoom || options.enablePan) {
    zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 8]).on('zoom', (event) => {
      rootGroup.attr('transform', event.transform.toString());
    });
    svg.call(zoomBehavior);
  }

  function render(): void {
    const visible = visibleNetworkModel(graph, state);
    const nodes: RuntimeNode[] = visible.nodes.map((node, index) => ({ ...node, x: node.x ?? width / 2 + Math.cos(index) * 120, y: node.y ?? height / 2 + Math.sin(index) * 90 }));
    const links: RuntimeLink[] = visible.links.map((link) => ({ ...link }));
    const byId = new Map(nodes.map((node) => [node.id, node]));

    const simulation = forceSimulation<RuntimeNode>(nodes)
      .force('link', forceLink<RuntimeNode, RuntimeLink>(links).id((node) => node.id).distance(options.linkDistance))
      .force('charge', forceManyBody<RuntimeNode>().strength(options.charge))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collision', forceCollide<RuntimeNode>().radius(options.nodeRadius + 6))
      .velocityDecay(options.friction)
      .stop();

    for (let i = 0; i < Math.min(180, nodes.length > 500 ? 80 : 140); i += 1) simulation.tick();

    const linkSelection = linkGroup.selectAll<SVGLineElement, RuntimeLink>('line').data(links, (link) => link.id);
    linkSelection.exit().remove();
    const linkEnter = linkSelection.enter().append('line').attr('class', 'network-link').attr('data-network-link-id', (link) => link.id);
    const mergedLinks = linkEnter.merge(linkSelection);
    mergedLinks
      .classed('network-link--highlighted', (link) => visible.highlightedLinkIds.has(link.id))
      .classed('network-link--muted', (link) => visible.mutedLinkIds.has(link.id))
      .attr('x1', (link) => nodeX(link.source, byId))
      .attr('y1', (link) => nodeY(link.source, byId))
      .attr('x2', (link) => nodeX(link.target, byId))
      .attr('y2', (link) => nodeY(link.target, byId));

    const nodeSelection = nodeGroup.selectAll<SVGCircleElement, RuntimeNode>('circle').data(nodes, (node) => node.id);
    nodeSelection.exit().remove();
    const nodeEnter = nodeSelection.enter().append('circle').attr('class', 'network-node').attr('r', options.nodeRadius).attr('data-network-node-id', (node) => node.id);
    nodeEnter.on('click', (event, node) => {
      event.stopPropagation();
      state = graph.subfolders[node.id] ? toggleFolder(state, node.id) : selectNode(state, node.id);
      host.dataset.xconNetworkSelected = node.id;
      render();
    });
    if (options.enableHover) {
      nodeEnter.on('mouseenter', (_event, node) => showTooltip(host, node)).on('mouseleave', () => hideTooltip(host));
    }
    if (options.enableDrag) {
      nodeEnter.call(
        drag<SVGCircleElement, RuntimeNode>()
          .on('start', function (_event, node) {
            select(this).classed('network-node--dragging', true);
            node.fx = node.x;
            node.fy = node.y;
          })
          .on('drag', function (event, node) {
            node.fx = event.x;
            node.fy = event.y;
            select(this).attr('cx', event.x).attr('cy', event.y);
          })
          .on('end', function (_event, node) {
            select(this).classed('network-node--dragging', false);
            node.x = node.fx;
            node.y = node.fy;
          }),
      );
    }
    const mergedNodes = nodeEnter.merge(nodeSelection);
    mergedNodes
      .classed('network-node--selected', (node) => state.selectedNodeId === node.id)
      .classed('network-node--highlighted', (node) => visible.highlightedNodeIds.has(node.id))
      .classed('network-node--muted', (node) => visible.mutedNodeIds.has(node.id))
      .attr('cx', (node) => Number(node.x ?? width / 2))
      .attr('cy', (node) => Number(node.y ?? height / 2))
      .attr('fill', (node) => node.color ?? undefined);

    const labels = options.showLabels ? labelGroup.selectAll<SVGTextElement, RuntimeNode>('text').data(nodes.filter((node) => node.isRoot || state.selectedNodeId === node.id || visible.highlightedNodeIds.has(node.id)), (node) => node.id) : labelGroup.selectAll<SVGTextElement, RuntimeNode>('text').data([]);
    labels.exit().remove();
    labels
      .enter()
      .append('text')
      .attr('class', 'network-label')
      .attr('data-network-label-id', (node) => node.id)
      .text((node) => node.label)
      .merge(labels)
      .attr('x', (node) => Number(node.x ?? width / 2))
      .attr('y', (node) => Number(node.y ?? height / 2) + options.nodeRadius + 14);
  }

  render();

  host.querySelector<HTMLElement>('[data-xcon-network-fit]')?.addEventListener('click', () => {
    if (zoomBehavior) svg.transition().duration(250).call(zoomBehavior.transform, zoomIdentity);
  });
  host.querySelector<HTMLElement>('[data-xcon-network-reset]')?.addEventListener('click', () => {
    state = createNetworkState(graph);
    delete host.dataset.xconNetworkSelected;
    render();
  });
}

function renderControls(host: HTMLElement, options: NetworkRuntimeOptions, update: (state: NetworkViewState) => void, getState: () => NetworkViewState, graph: NetworkGraphModel): void {
  if (!options.showControls) return;
  let toolbar = host.querySelector<HTMLElement>('[data-xcon-network-toolbar]');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.dataset.xconNetworkToolbar = 'true';
    toolbar.className = 'xa-network-toolbar';
    host.prepend(toolbar);
  }
  toolbar.innerHTML = '';
  if (options.showSearch) {
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search';
    input.dataset.xconNetworkSearch = 'true';
    input.addEventListener('input', () => update({ ...getState(), search: input.value }));
    toolbar.append(input);
  }
  const fit = document.createElement('button');
  fit.type = 'button';
  fit.dataset.xconNetworkFit = 'true';
  fit.textContent = 'Fit';
  toolbar.append(fit);
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.dataset.xconNetworkReset = 'true';
  reset.textContent = 'Reset';
  toolbar.append(reset);
  if (options.showLegend && graph.groups.length > 0) {
    const legend = document.createElement('div');
    legend.dataset.xconNetworkLegend = 'true';
    legend.textContent = graph.groups.map((group) => group.label).join(' / ');
    toolbar.append(legend);
  }
}

function parseJson<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function nodeX(value: string | RuntimeNode, byId: Map<string, RuntimeNode>): number {
  const node = typeof value === 'string' ? byId.get(value) : value;
  return Number(node?.x ?? 0);
}

function nodeY(value: string | RuntimeNode, byId: Map<string, RuntimeNode>): number {
  const node = typeof value === 'string' ? byId.get(value) : value;
  return Number(node?.y ?? 0);
}

function showTooltip(host: HTMLElement, node: NetworkNode): void {
  const tooltip = host.querySelector<HTMLElement>('[data-xcon-network-tooltip]');
  if (!tooltip) return;
  tooltip.textContent = node.label;
  tooltip.classList.add('show');
}

function hideTooltip(host: HTMLElement): void {
  host.querySelector<HTMLElement>('[data-xcon-network-tooltip]')?.classList.remove('show');
}
```

- [ ] **Step 4: Wire `hydrateXconViewer`**

In `packages/viewer/src/renderer/index.ts`, add:

```ts
import { hydrateNetworkDiagrams } from './network/runtime';
```

Inside exported `hydrateXconViewer`, add this call after existing safe hydration calls:

```ts
hydrateNetworkDiagrams(root);
```

Do not add D3 loading to the `viewerScript` string in this task. Standalone `renderDocument()` keeps the static fallback unless a future generated inline runtime is designed.

- [ ] **Step 5: Run runtime tests**

Run:

```powershell
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/runtime.test.ts
npm --workspace @xcon-viewer/viewer test -- --run -t network
```

Expected: PASS for both commands.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/viewer/src/renderer/network/runtime.ts packages/viewer/src/renderer/network/runtime.test.ts packages/viewer/src/renderer/index.ts
git commit -m "feat(viewer): hydrate network diagrams with d3"
```

Expected: commit succeeds.

## Task 7: Add Security Tests And Defensive Runtime Behavior

**Files:**
- Modify: `packages/core/src/validator/index.ts`
- Modify: `packages/core/src/core.test.ts`
- Modify: `packages/viewer/src/renderer/network/runtime.test.ts`
- Modify: `packages/viewer/src/renderer/renderer.test.ts`

- [ ] **Step 1: Add core validator test for executable network props**

Add to `packages/core/src/core.test.ts`:

```ts
test('rejects executable networkDiagram props in public viewer validation', () => {
  const doc = fromJSONObject({
    type: 'form',
    components: {
      network: {
        type: 'networkDiagram',
        nodes: [{ id: 'a', label: 'A' }],
        onNodeClick: 'alert(1)',
        onNodeHover: 'alert(2)',
        onNodeDrag: 'alert(3)',
        onLinkClick: 'alert(4)',
      },
    },
  });

  const result = validate(doc);

  expect(result.valid).toBe(false);
  expect(result.errors.map((error) => error.message)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('onNodeClick'),
      expect.stringContaining('onNodeHover'),
      expect.stringContaining('onNodeDrag'),
      expect.stringContaining('onLinkClick'),
    ]),
  );
});
```

- [ ] **Step 2: Run test and verify failure**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run -t "executable networkDiagram"
```

Expected before validator update: FAIL if the validator does not explicitly reject all four properties.

- [ ] **Step 3: Extend validator executable prop rejection**

In `packages/core/src/validator/index.ts`, ensure the existing viewer-only prop checks reject these names:

```ts
'onNodeClick',
'onNodeHover',
'onNodeDrag',
'onLinkClick',
```

If the validator already rejects them through `/^on[A-Z]/`, keep the test and do not duplicate entries unnecessarily.

- [ ] **Step 4: Add runtime safety test**

Append to `packages/viewer/src/renderer/network/runtime.test.ts`:

```ts
test('does not execute legacy callback strings during local selection', () => {
  const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  document.body.innerHTML = `
    <div class="xa-network-diagram-container"
      data-xcon-network="true"
      data-xcon-network-model='{"nodes":[{"id":"a","label":"A","metadata":{},"isRoot":true}],"links":[],"groups":[],"subfolders":{}}'
      data-xcon-network-options='{"nodeRadius":25,"linkDistance":80,"charge":-1500,"friction":0.75,"showLabels":true,"showArrows":true,"showControls":true,"showSearch":true,"showFilters":true,"showLegend":true,"enableDrag":true,"enableZoom":true,"enablePan":true,"enableHover":true}'
      data-on-node-click="alert(1)"
    ><svg class="network-svg"></svg><div class="network-tooltip"></div></div>
  `;

  hydrateNetworkDiagrams(document);
  document.querySelector<SVGElement>('[data-network-node-id="a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});
```

- [ ] **Step 5: Run security tests**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run -t "executable networkDiagram"
npm --workspace @xcon-viewer/viewer test -- --run src/renderer/network/runtime.test.ts -t "legacy callback"
```

Expected: PASS for both commands.

- [ ] **Step 6: Commit**

Run:

```powershell
git add packages/core/src/validator/index.ts packages/core/src/core.test.ts packages/viewer/src/renderer/network/runtime.test.ts packages/viewer/src/renderer/renderer.test.ts
git commit -m "test(viewer): lock network diagram security boundary"
```

Expected: commit succeeds.

## Task 8: Update Schema And Public Documentation

**Files:**
- Modify: `scripts/update-xcon-schema.mjs`
- Modify: `schema/xcon.schema.json`
- Modify: `scripts/xcon-schema.test.mjs`
- Modify: `docs/xcon-component-specs.en.md`
- Modify: `docs/ecosystem.md`
- Modify: `site/llms-full.txt`
- Modify: `prompts/00-shared-xcon-contract.md`
- Modify: `prompts/01-sketch-ui-generation.md`
- Modify: `prompts/02-markdown-xcon-document.md`
- Modify: `prompts/07-template-lab-business-document.md`

- [ ] **Step 1: Add schema test expectations**

In `scripts/xcon-schema.test.mjs`, inside `test('forbids executable runtime references in public documents', ...)`, after `const componentProps = schema.definitions.component.properties;`, add:

```js
for (const prop of [
  'theme',
  'showControls',
  'showSearch',
  'showFilters',
  'showLegend',
  'selectedColor',
  'neighborColor',
  'mutedOpacity',
  'clusterColors',
  'panelBackground',
  'edges',
]) {
  expect(componentProps).toHaveProperty(prop);
}
```

- [ ] **Step 2: Run schema test and verify failure**

Run:

```powershell
vitest run scripts/xcon-schema.test.mjs
```

Expected: FAIL because schema does not yet expose one or more new properties.

- [ ] **Step 3: Update schema generator**

In `scripts/update-xcon-schema.mjs`, add the new safe properties to the shared component property map:

```js
theme: { type: 'string', enum: ['obsidian', 'light', 'auto', 'custom'] },
showControls: { type: 'boolean' },
showSearch: { type: 'boolean' },
showFilters: { type: 'boolean' },
showLegend: { type: 'boolean' },
selectedColor: { $ref: '#/definitions/color' },
neighborColor: { $ref: '#/definitions/color' },
mutedOpacity: { type: 'number', minimum: 0, maximum: 1 },
clusterColors: { type: 'array', items: { $ref: '#/definitions/color' } },
panelBackground: { $ref: '#/definitions/color' },
edges: { type: 'array', items: { $ref: '#/definitions/safeObject' } },
```

Run the generator:

```powershell
node scripts/update-xcon-schema.mjs
```

Expected: `schema/xcon.schema.json` changes.

- [ ] **Step 4: Update docs**

In `docs/xcon-component-specs.en.md`, replace the one-line `networkDiagram` entry with:

```md
| `networkDiagram` | Obsidian-like D3 network graph. Supports static fallback, local-only search/filter/selection, `nodes`/`links`, and full-version `data.list` compatibility. |
```

In `docs/ecosystem.md`, replace the outdated `@pomelo-suite/diagram` sentence with:

```md
| Diagram -> XCON Viewer | XCON's `networkDiagram` component renders a safe static SVG fallback and hydrates to a bundled D3 graph in the public viewer runtime. |
```

In `site/llms-full.txt`, update the `networkDiagram` example to use `links` instead of `edges`:

```xcon-sketch
  topology: networkDiagram at 24 24 560 320
    theme "obsidian"
    nodes [{"id":"gw","label":"Gateway","x":280,"y":40,"color":"#8b5cf6"},{"id":"a","label":"Server A","x":140,"y":160,"group":"app"},{"id":"b","label":"Server B","x":420,"y":160,"group":"app"}]
    links [{"source":"gw","target":"a"},{"source":"gw","target":"b"}]
```

In each prompt file that mentions `networkDiagram`, add one sentence:

```md
Prefer `links` over compatibility-only `edges`; use `theme "obsidian"` for dense relationship maps.
```

- [ ] **Step 5: Run schema/docs checks**

Run:

```powershell
vitest run scripts/xcon-schema.test.mjs
npm run test:site
```

Expected: PASS for both commands.

- [ ] **Step 6: Commit**

Run:

```powershell
git add scripts/update-xcon-schema.mjs schema/xcon.schema.json scripts/xcon-schema.test.mjs docs/xcon-component-specs.en.md docs/ecosystem.md site/llms-full.txt prompts/00-shared-xcon-contract.md prompts/01-sketch-ui-generation.md prompts/02-markdown-xcon-document.md prompts/07-template-lab-business-document.md
git commit -m "docs: document d3 network diagram options"
```

Expected: commit succeeds.

## Task 9: Refresh Showcase Example

**Files:**
- Modify: `examples/showcase/p_network_diagram.xcon.sketch`
- Modify: `examples/showcase/p_network_diagram.xcon.json`
- Modify: `examples/showcase/p_network_diagram.xcon.xml`
- Modify: `examples/showcase/p_network_diagram.xcon`
- Modify if present: showcase generation script used by this repository

- [ ] **Step 1: Update SKETCH source**

Replace `examples/showcase/p_network_diagram.xcon.sketch` network block with:

```xcon-sketch
  network: networkDiagram at 24 88 512 244
    theme "obsidian"
    nodeRadius 18
    linkDistance 92
    charge -900
    friction 0.72
    showControls true
    showSearch true
    showFilters true
    showLegend true
    showLabels true
    showArrows true
    nodes [{"id":"viewer","label":"Viewer","group":"runtime","color":"#8b5cf6"},{"id":"core","label":"Core","group":"parser","color":"#38bdf8"},{"id":"sketch","label":"SKETCH","group":"syntax","color":"#22c55e"},{"id":"docs","label":"Docs","group":"content","color":"#f59e0b"},{"id":"site","label":"Public site","group":"content","color":"#ef4444"}]
    links [{"source":"viewer","target":"core"},{"source":"viewer","target":"sketch"},{"source":"viewer","target":"docs","type":"ref"},{"source":"docs","target":"site"},{"source":"core","target":"sketch","type":"folder"}]
```

- [ ] **Step 2: Manually synchronize JSON example**

Update `examples/showcase/p_network_diagram.xcon.json` so the `network` component contains this object:

```json
{
  "type": "networkDiagram",
  "pos": [24, 88, 512, 244],
  "theme": "obsidian",
  "nodeRadius": 18,
  "linkDistance": 92,
  "charge": -900,
  "friction": 0.72,
  "showControls": true,
  "showSearch": true,
  "showFilters": true,
  "showLegend": true,
  "showLabels": true,
  "showArrows": true,
  "nodes": [
    { "id": "viewer", "label": "Viewer", "group": "runtime", "color": "#8b5cf6" },
    { "id": "core", "label": "Core", "group": "parser", "color": "#38bdf8" },
    { "id": "sketch", "label": "SKETCH", "group": "syntax", "color": "#22c55e" },
    { "id": "docs", "label": "Docs", "group": "content", "color": "#f59e0b" },
    { "id": "site", "label": "Public site", "group": "content", "color": "#ef4444" }
  ],
  "links": [
    { "source": "viewer", "target": "core" },
    { "source": "viewer", "target": "sketch" },
    { "source": "viewer", "target": "docs", "type": "ref" },
    { "source": "docs", "target": "site" },
    { "source": "core", "target": "sketch", "type": "folder" }
  ]
}
```

- [ ] **Step 3: Manually synchronize XML example**

Update the `<NetworkDiagram ... />` element in `examples/showcase/p_network_diagram.xcon.xml` with these attributes:

```xml
<NetworkDiagram name="network" pos="24,88,512,244" theme="obsidian" nodeRadius="18" linkDistance="92" charge="-900" friction="0.72" showControls="true" showSearch="true" showFilters="true" showLegend="true" showLabels="true" showArrows="true" nodes="[{&quot;id&quot;:&quot;viewer&quot;,&quot;label&quot;:&quot;Viewer&quot;,&quot;group&quot;:&quot;runtime&quot;,&quot;color&quot;:&quot;#8b5cf6&quot;},{&quot;id&quot;:&quot;core&quot;,&quot;label&quot;:&quot;Core&quot;,&quot;group&quot;:&quot;parser&quot;,&quot;color&quot;:&quot;#38bdf8&quot;},{&quot;id&quot;:&quot;sketch&quot;,&quot;label&quot;:&quot;SKETCH&quot;,&quot;group&quot;:&quot;syntax&quot;,&quot;color&quot;:&quot;#22c55e&quot;},{&quot;id&quot;:&quot;docs&quot;,&quot;label&quot;:&quot;Docs&quot;,&quot;group&quot;:&quot;content&quot;,&quot;color&quot;:&quot;#f59e0b&quot;},{&quot;id&quot;:&quot;site&quot;,&quot;label&quot;:&quot;Public site&quot;,&quot;group&quot;:&quot;content&quot;,&quot;color&quot;:&quot;#ef4444&quot;}]" links="[{&quot;source&quot;:&quot;viewer&quot;,&quot;target&quot;:&quot;core&quot;},{&quot;source&quot;:&quot;viewer&quot;,&quot;target&quot;:&quot;sketch&quot;},{&quot;source&quot;:&quot;viewer&quot;,&quot;target&quot;:&quot;docs&quot;,&quot;type&quot;:&quot;ref&quot;},{&quot;source&quot;:&quot;docs&quot;,&quot;target&quot;:&quot;site&quot;},{&quot;source&quot;:&quot;core&quot;,&quot;target&quot;:&quot;sketch&quot;,&quot;type&quot;:&quot;folder&quot;}]" />
```

- [ ] **Step 4: Manually synchronize TAGLESS example**

Update `examples/showcase/p_network_diagram.xcon` so the network component includes the same keys and values as the SKETCH source:

```text
♧theme♣◇obsidian◆
♧nodeRadius♣◇18◆
♧linkDistance♣◇92◆
♧charge♣◇-900◆
♧friction♣◇0.72◆
♧showControls♣◇true◆
♧showSearch♣◇true◆
♧showFilters♣◇true◆
♧showLegend♣◇true◆
♧showLabels♣◇true◆
♧showArrows♣◇true◆
♧nodes♣◇[{"id":"viewer","label":"Viewer","group":"runtime","color":"#8b5cf6"},{"id":"core","label":"Core","group":"parser","color":"#38bdf8"},{"id":"sketch","label":"SKETCH","group":"syntax","color":"#22c55e"},{"id":"docs","label":"Docs","group":"content","color":"#f59e0b"},{"id":"site","label":"Public site","group":"content","color":"#ef4444"}]◆
♧links♣◇[{"source":"viewer","target":"core"},{"source":"viewer","target":"sketch"},{"source":"viewer","target":"docs","type":"ref"},{"source":"docs","target":"site"},{"source":"core","target":"sketch","type":"folder"}]◆
```

- [ ] **Step 5: Test example rendering**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run -t TAGLESS
npm --workspace @xcon-viewer/viewer test -- --run -t network
```

Expected: PASS for both commands.

- [ ] **Step 6: Commit**

Run:

```powershell
git add examples/showcase/p_network_diagram.xcon.sketch examples/showcase/p_network_diagram.xcon.json examples/showcase/p_network_diagram.xcon.xml examples/showcase/p_network_diagram.xcon
git commit -m "docs: refresh network diagram showcase"
```

Expected: commit succeeds.

## Task 10: Final Verification

**Files:**
- Verify all changed files from previous tasks.

- [ ] **Step 1: Run focused package tests**

Run:

```powershell
npm --workspace @xcon-viewer/core test -- --run
npm --workspace @xcon-viewer/viewer test -- --run
```

Expected: both commands PASS.

- [ ] **Step 2: Run schema and site checks**

Run:

```powershell
vitest run scripts/xcon-schema.test.mjs
npm run test:site
```

Expected: both commands PASS.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run build for core and viewer**

Run:

```powershell
npm --workspace @xcon-viewer/core run build
npm --workspace @xcon-viewer/viewer run build
```

Expected: both builds PASS.

- [ ] **Step 5: Inspect git status**

Run:

```powershell
git status --short
```

Expected: only intentional files remain changed. Pre-existing unrelated files under `site/`, `tools/`, `dashboards/`, `.superpowers/`, and `site/assets/` must not be staged.

- [ ] **Step 6: Commit verification fixes only when files changed**

If Task 10 required verification-only fixes, commit those fixes:

```powershell
git add packages/core packages/viewer scripts schema docs site/llms-full.txt prompts examples/showcase package-lock.json package.json
git commit -m "test: verify d3 network diagram"
```

Expected: commit succeeds when verification fixes exist. When there are no verification fixes, skip this step and leave no staged files.

## Self-Review

- Spec coverage: covered D3 dependency, internal module split, public/full data models, Obsidian default theme, compact controls, local-only interactions, static fallback, security, target performance, docs/schema/examples.
- Red-flag scan: no incomplete requirement markers or unnamed follow-up tasks remain in this plan.
- Type consistency: `NetworkGraphModel`, `NetworkNode`, `NetworkLink`, `NetworkTheme`, `NetworkViewState`, and `NetworkVisibleModel` are defined before later tasks use them.
- Known execution note: standalone `renderDocument()` currently uses the inline `viewerScript` string and cannot automatically import bundled ESM D3. This plan keeps static fallback for standalone documents and applies D3 hydration through the package/Web Component runtime path. A later design can add generated inline runtime support if standalone full-document interactivity is required.
