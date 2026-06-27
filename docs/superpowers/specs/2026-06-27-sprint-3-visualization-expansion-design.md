# Sprint 3 Visualization Expansion Design

## Context

Sprint 3 expands the public `xcon-viewer` advanced visualization surface while keeping the public viewer security boundary intact. The viewer is the public, reduced version of the internal Xamong UI component runtime: actions, host event wiring, executable callbacks, and sensitive internal behaviors stay outside this package.

The local source snapshot currently exposes fewer public component types than the Sprint note references. The implementation should follow the repository as the source of truth and update schemas, docs, tests, and prompt guidance consistently instead of relying on the older count.

`networkDiagram` has already moved toward an Obsidian-style professional graph experience. Sprint 3 should extend that same quality bar to additional analysis components without turning the public viewer into an application runtime.

## Goals

- Add D3-based advanced visualization support for `treemap`, `sankey`, `sunburst`, `chord`, and `forceGraph`.
- Add Observable Plot support through a safe public `plot` visualization.
- Keep `dataViz + vizType` as the canonical public rendering contract.
- Accept short alias component types and normalize them internally to `dataViz + vizType`.
- Strengthen the existing Leaflet-backed `map` component with polyline, polygon, heatmap, and marker clustering support.
- Preserve static SVG or HTML fallback output for every new visualization.
- Expand the existing visualization test page so network, dataViz, plot, and map samples can be tested from one place.
- Update Gowoori in `xenesis-desk` so generated XCON uses the public viewer contract.

## Non-Goals

- Do not add public action dispatch, callbacks, triggers, or host workflow integration.
- Do not implement fixture-driven real-time map updates in this sprint.
- Do not connect Xenesis Desk chains or workflow runners to map layers in this sprint.
- Do not add offline tile cache/storage in this sprint.
- Do not replace `networkDiagram` with `forceGraph`; `networkDiagram` remains the richer relationship-analysis component.
- Do not make user-provided JavaScript, Observable Plot callbacks, formatter functions, or eval-like behavior executable.
- Do not turn the test page into a full authoring product.

## Architecture

`xcon-viewer` remains the source of truth for public rendering behavior. `xenesis-desk` and Gowoori should generate syntax that the public viewer can render, but they should not define separate public behavior.

The viewer implementation should split new visualization logic out of the already-large `packages/viewer/src/renderer/index.ts` file:

- `packages/core`: component validation, property definitions, schema generation, and alias normalization support.
- `packages/viewer/src/renderer/index.ts`: high-level component dispatch and wrapper markup only.
- `packages/viewer/src/renderer/dataviz/*`: dataViz normalization, fallback rendering, D3/Plot hydration helpers, and visualization-specific renderers.
- `packages/viewer/src/renderer/map/*`: Leaflet layer normalization, map fallback, and optional plugin hydration.
- `packages/viewer/src/renderer/network/*`: existing networkDiagram runtime, kept separate from lightweight `forceGraph`.
- `site/*`: shared advanced visualization test page and generated browser runtime bundle.
- `xenesis-desk`: Gowoori strategy, prompts, and mock scenarios aligned to the public syntax.

This design keeps each visualization family testable without requiring future changes to concentrate inside the main renderer file.

## Public Syntax

The canonical syntax is `dataViz` with a `vizType`:

```xcon-sketch
usageTree: dataViz at 24 120 360 260
  vizType "treemap"
  data {
    name "Workspace"
    children [
      { name "Viewer" value 42 }
      { name "Core" value 28 }
    ]
  }
  config {
    theme "dark"
    labels true
  }
```

Alias syntax is accepted for authoring convenience:

```xcon-sketch
usageTree: treemap at 24 120 360 260
  data {
    name "Workspace"
    children [
      { name "Viewer" value 42 }
      { name "Core" value 28 }
    ]
  }
```

The parser and renderer normalize these aliases:

- `treemap` -> `dataViz` with `vizType: "treemap"`
- `sankey` -> `dataViz` with `vizType: "sankey"`
- `sunburst` -> `dataViz` with `vizType: "sunburst"`
- `chord` -> `dataViz` with `vizType: "chord"`
- `forceGraph` -> `dataViz` with `vizType: "forceGraph"`
- `plot` -> `dataViz` with `vizType: "plot"`

Docs and Gowoori prompts should prefer the canonical syntax. Alias syntax can be documented as a compact input form.

## Component Scope

### Treemap

`treemap` renders hierarchical proportions from nested data. It uses `d3-hierarchy` for browser hydration and a static SVG rectangle fallback when JavaScript is unavailable or data is incomplete.

Expected data:

```ts
type HierarchyDatum = {
  name: string;
  value?: number;
  children?: HierarchyDatum[];
};
```

### Sunburst

`sunburst` renders hierarchical proportions in radial form. It shares the hierarchy data contract with `treemap`, uses `d3-hierarchy`, and falls back to a static radial SVG preview.

### Sankey

`sankey` renders flow, cost, or dependency volume. It uses `d3-sankey` during hydration and a static layered SVG fallback.

Expected data:

```ts
type SankeyData = {
  nodes: Array<{ id: string; label?: string; color?: string }>;
  links: Array<{ source: string; target: string; value: number; label?: string }>;
};
```

### Chord

`chord` renders relationship matrices. It accepts a matrix-first form and may also accept `nodes + links`, which the viewer converts to a matrix.

Expected data:

```ts
type ChordData =
  | { matrix: number[][]; labels?: string[] }
  | { nodes: Array<{ id: string; label?: string }>; links: Array<{ source: string; target: string; value: number }> };
```

### ForceGraph

`forceGraph` is a lightweight graph embedded in `dataViz`. It is useful for compact relationship previews, not a replacement for `networkDiagram`. Professional exploration features such as search, filters, fit/reset controls, folder behavior, and Obsidian-like graph analysis stay with `networkDiagram`.

Expected data:

```ts
type ForceGraphData = {
  nodes: Array<{ id: string; label?: string; group?: string; color?: string }>;
  links: Array<{ source: string; target: string; value?: number; label?: string }>;
};
```

### Plot

`plot` uses `@observablehq/plot` for concise exploratory visualization. The viewer accepts a restricted declarative shape and rejects executable functions.

Expected data:

```ts
type PlotData = {
  data: Array<Record<string, unknown>>;
  marks: Array<{
    type: "barY" | "barX" | "line" | "areaY" | "dot" | "ruleY" | "ruleX";
    x?: string;
    y?: string;
    fill?: string;
    stroke?: string;
  }>;
  options?: Record<string, unknown>;
};
```

The initial mark list should stay intentionally small. It can expand later after the viewer has security tests and public examples for each mark type.

## Dependencies

Add only the modules needed by the public viewer implementation:

- `d3-hierarchy`
- `d3-sankey`
- `d3-force`
- `d3-chord`
- `@observablehq/plot`

Imports should be module-level and tree-shakable. The existing `d3` dependency can remain for `networkDiagram` unless a later cleanup removes it safely.

Leaflet is already part of the current map behavior through dynamic loading. New map plugin support may use viewer-controlled plugin URLs for `leaflet.heat` and `leaflet.markercluster`, with graceful fallback when those resources are unavailable.

## Data Flow

Rendering follows a static-first, hydrate-second model:

1. Parser/core validates and normalizes component type and properties.
2. Aliases are normalized to `dataViz + vizType`.
3. The server/string renderer emits wrapper markup, safe data attributes, and a static fallback.
4. Browser runtime discovers hydratable components.
5. D3, Observable Plot, or Leaflet replaces the fallback inside the component boundary.
6. If hydration fails, the fallback remains visible and the component records a local warning state.

No visualization may break the whole document render because of bad data, missing optional dependencies, or plugin load failure.

## Error Handling

Each visualization has a component-local error boundary:

- Missing optional data results in a partial fallback when `allowPartial` is enabled.
- Missing required data results in a fallback with a compact warning state.
- Runtime import or plugin loading failure leaves the fallback visible.
- Invalid numeric values are filtered or clamped rather than propagated into SVG geometry.
- Unknown `vizType` falls back to the current generic `dataViz` preview.

`allowPartial` means "render the meaningful subset that is present." It does not permit unsafe data, executable behavior, or malformed structures that would crash the renderer.

## Security

The public viewer security boundary remains unchanged:

- No executable callbacks, action handlers, event bridges, or custom host dispatch.
- Tooltip, label, popup, and metadata text is escaped.
- User-provided HTML is not inserted into visualization containers.
- Observable Plot options are declarative only; function-valued options are rejected or ignored.
- Tile URLs and icon URLs use the viewer's existing URL safety policy.
- CDN/plugin URLs are viewer-controlled, not user-controlled.
- Hydration failures do not expose raw error stacks in rendered UI.

## Map Scope

The existing map renderer is enhanced rather than replaced.

Supported first-pass layers:

- Markers from existing marker data.
- `polylines` for paths and routes.
- `polygons` for zones and regions.
- `heatmap` through `leaflet.heat` when the controlled plugin loads.
- `clustering` through `leaflet.markercluster` when the controlled plugin loads.

Fallback behavior:

- If Leaflet itself fails, the existing static map fallback remains.
- If `leaflet.heat` fails, heatmap data is ignored with a local warning; markers, polylines, and polygons still render.
- If `leaflet.markercluster` fails, markers render without clustering.

Optional property additions may include `heatmapOptions` and `clusterOptions`, but they must remain declarative and sanitized.

## Test And Demo Page

The current network test page should evolve into a shared advanced visualization page:

- New page: `site/advanced-visualization-test.html`
- New entry: `site/advanced-visualization-test-entry.mjs`
- Generated runtime bundle: `site/advanced-visualization-test-runtime.js`

Keep `site/network-diagram-test.html` available for compatibility, either as a retained focused page or a lightweight link/redirect to the advanced page.

The page should include:

- Sample selector.
- XCON SKETCH source editor.
- Render/reset controls.
- Rendered preview.
- Basic status/check panel.
- Samples for `networkDiagram`, `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, `plot`, and map layers.

The browser runtime bundle should keep a `.js` extension to avoid the MIME-type issue previously seen with `.mjs` test runtime serving.

Expected local URL:

```text
http://127.0.0.1:4173/site/advanced-visualization-test.html
```

## Gowoori And Xenesis Desk

The Desk path is:

```text
D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk
```

Update Gowoori as a consumer of the public viewer contract:

- Extend `gowooriRichComponentStrategy.ts` with advanced `dataViz` generation guidance.
- Add prompt guidance for `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, and `plot`.
- Prefer canonical `dataViz + vizType` in generated examples.
- Mention alias syntax only as a compact authoring option.
- Review existing mock scenarios that already reference `treemap`, `sunburst`, or `forceGraph` and align them with the public syntax.

Desk-local helpers such as `visualizations/d3Components.ts` and `observablePlotHelper.ts` can inform the public design, but the public viewer should not depend on Desk internals.

## Testing

Coverage should include:

- Core validator/parser/schema support for new aliases and `dataViz` properties.
- Alias normalization to `dataViz + vizType`.
- Static fallback rendering for all new visualization types.
- Runtime hydration wiring for D3/Plot visualizations where jsdom can validate the DOM contract.
- Map wrapper attributes and layer normalization for marker, polyline, polygon, heatmap, and clustering data.
- Site structure tests for the new advanced visualization page, runtime import path, and required sample names.
- Regression checks for existing `networkDiagram` controls: Fit, Reset, search, filters, and fallback.
- Gowoori prompt/strategy tests or focused source checks, depending on the Desk test structure.

Browser smoke testing should verify at least one network sample, one D3 dataViz sample, one Plot sample, and one map-layer sample in a real page.

## Acceptance Criteria

- `xcon-viewer` renders `dataViz` with `vizType` values `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, and `plot`.
- Alias component types `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, and `plot` normalize internally to `dataViz + vizType`.
- Every new visualization has a meaningful static fallback when runtime hydration fails.
- `map` handles marker, polyline, polygon, heatmap, and clustering input without breaking existing marker behavior.
- Optional map plugin failure degrades gracefully.
- The advanced visualization test page lets users switch among network, dataViz, plot, and map samples in one UI.
- Gowoori prompt and strategy guidance generate the public canonical syntax.
- Existing `networkDiagram` behavior does not regress.
- Fixture real-time updates, Desk chain connection, and offline tile caching remain outside Sprint 3 completion.

