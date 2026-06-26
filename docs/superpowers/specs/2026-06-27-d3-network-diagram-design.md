# D3 Network Diagram Design

## Context

`networkDiagram` is currently a public advanced XCON component rendered by `@xcon-viewer/viewer` as a safe static SVG preview. The public viewer is a reduced, safe version of the internal `xamong-ui-components` runtime: host-only actions, executable event handlers, and unsafe runtime behaviors are intentionally removed.

The internal full version includes a D3-based `XaNetworkDiagram` with force layout, zoom, drag, tooltip, folder expansion, and related graph behavior. The public viewer should reach at least that pure viewer feature level while preserving the public viewer security boundary. The target experience is comparable to Obsidian's network graph: dense, exploratory, searchable, filterable, and focused on relationship analysis.

## Goals

- Replace the current static-only graph experience with a professional D3-powered interactive graph after hydration.
- Keep static SVG output as the no-JS and hydration-failure fallback.
- Support both the current public `nodes[]` / `links[]` model and the full-version `data.list` / `data.infos` / `data.names` / `data.subfolders` model.
- Default to an Obsidian-like dark graph theme while keeping theme and color customization available.
- Preserve public viewer security rules: no XCON actions, no executable event handlers, no external script loading.
- Target 200-1,000 nodes and 500-3,000 links for the first implementation.

## Non-Goals

- Do not dispatch public DOM events or execute callbacks such as `onNodeClick`, `onNodeHover`, `onNodeDrag`, or `onLinkClick`.
- Do not load D3 from a CDN.
- Do not introduce a new public package for the network renderer in this phase.
- Do not target very large graphs above 1,000 nodes as the primary performance case.
- Do not add editing, persistence, mutation APIs, or host-side action integration.

## Architecture

Use an internal network runtime inside `@xcon-viewer/viewer`. The public component remains `type: "networkDiagram"`.

`renderToHtml()` continues to emit a safe static SVG fallback. Browser hydration upgrades the same component into a D3-powered interactive graph. The renderer should not depend on `allowExternalResources` for D3 itself; D3 is bundled through npm dependencies.

The implementation should be split into focused internal units:

- `network-data`: normalizes all supported graph inputs into one internal model.
- `network-static`: renders the static SVG fallback using the same normalized model.
- `network-runtime`: owns D3 force simulation, zoom/pan, drag, selection, search, filters, legend, and fit/reset behavior.
- `network-theme`: resolves `obsidian`, `light`, `auto`, and `custom` themes into safe CSS variables and color values.
- `renderer/index.ts`: stays responsible for wrapper markup, safe data attributes, static fallback insertion, and hydration wiring.

This keeps the large viewer renderer from absorbing all graph logic and makes the data/model/runtime pieces easier to test independently.

## Data Model

Support two official input families:

- Public model: `nodes[]`, `links[]`.
- Full-version compatibility model: `data.list`, `data.infos`, `data.names`, `data.subfolders`.

Normalize both into:

```ts
type NetworkGraphModel = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  groups: NetworkGroup[];
  rootNodeId?: string;
  subfolders: Record<string, NetworkSubfolder>;
};

type NetworkNode = {
  id: string;
  label: string;
  type?: string;
  group?: string;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  x?: number;
  y?: number;
  fixed?: boolean;
  parentId?: string;
  isRoot?: boolean;
};

type NetworkLink = {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
};

type NetworkGroup = {
  id: string;
  label: string;
  color?: string;
  metadata?: Record<string, unknown>;
};

type NetworkSubfolder = {
  parentId: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
};
```

`links` is the documented standard property. `edges` may be accepted as an alias for compatibility, but generated docs and examples should prefer `links`.

Coordinates from input nodes are respected as initial positions. Nodes without coordinates are placed by the D3 simulation. Folder/subfolder data starts collapsed; clicking a folder node expands or collapses child nodes inside component-local state only.

## Theme

The default theme is `obsidian`.

Supported theme values:

- `obsidian`: dark canvas, dense graph, low chrome, strong focus and neighbor highlighting.
- `light`: public viewer friendly light graph for reports and embedded documents.
- `auto`: chooses `obsidian` when the resolved background is dark and `light` when it is bright; if luminance cannot be determined, it falls back to `obsidian`.
- `custom`: uses explicit color properties and CSS variables.

Existing color properties continue to work:

- `backgroundColor`
- `nodeColor`
- `linkColor`
- `refLinkColor`
- `primaryColor`
- `accentColor`
- `textColor`

Add these network-specific visual tokens:

- `selectedColor`
- `neighborColor`
- `mutedOpacity`
- `clusterColors`
- `panelBackground`

All theme output must be expressed through safe CSS values and CSS variables.

## Interactions

The first implementation includes:

- D3 force layout with collision handling.
- Zoom and pan.
- Node drag.
- Hover tooltip.
- Node click selection.
- Selected node neighbor and link highlight.
- Search.
- Node, link, and group filtering.
- Compact overlay controls.
- Legend.
- Fit-to-view and reset.
- Folder expand/collapse.

Controls use a compact overlay by default:

- Always visible or readily accessible: search, fit, reset, legend toggle.
- Collapsed panel: node type/group filters, degree filters, link type filters, detailed legend.
- Small components automatically reduce visible chrome.

## Security

The public viewer security boundary remains unchanged.

- Validator rejects executable properties such as `onNodeClick`, `onNodeHover`, `onNodeDrag`, `onLinkClick`, `actions`, and `triggers`; runtime ignores them defensively if legacy input reaches hydration.
- Node click changes only component-local selection state.
- No callback execution and no public CustomEvent dispatch in this phase.
- Tooltip and inspector text are escaped. Metadata is rendered as text, not HTML.
- Node icon URLs use the existing `sanitizeUrl()` policy. External icons require `allowExternalResources`.
- D3 is bundled as npm dependencies. No CDN script loading is added.
- If hydration fails, the static fallback remains visible.

## Performance

The target graph size is 200-1,000 nodes and 500-3,000 links.

Performance controls:

- Limit initial simulation work so large graphs do not freeze the page.
- Use progressive stabilization through D3 alpha and velocity settings.
- Limit always-visible labels. Prioritize selected, hovered, searched, and high-zoom nodes.
- Use filters and search to reduce visible density.
- Add a degraded or compact mode for graphs above the supported threshold.
- Keep transitions limited to hover, selection, fit, and reset.

Very large graphs above the target range are out of scope for this phase and may require a later Web Worker or canvas/WebGL design.

## Testing

Testing should cover:

- Core parser/property/schema support for new `networkDiagram` options and compatibility aliases.
- Data normalization from public `nodes[]` / `links[]`.
- Data normalization from full-version `data.list` / `data.infos` / `data.names` / `data.subfolders`.
- Static fallback rendering without D3.
- Runtime hydration wiring and safe DOM state for D3 graphs.
- Security behavior for executable properties, tooltip text, metadata text, and icon URL sanitization.
- Theme resolution for `obsidian`, `light`, and custom colors.
- Search, filter, selection, neighbor highlight, fit/reset, and folder expansion behavior.
- Updated examples, schema, docs, and `site/llms-full.txt` guidance.

Where jsdom cannot validate SVG geometry or D3 layout reliably, test pure normalization/theme logic and DOM attributes directly, then add a browser smoke test for real hydration.

## Documentation Updates

Update:

- `examples/showcase/p_network_diagram.*`
- `docs/xcon-component-specs.en.md`
- `docs/ecosystem.md`
- `schema/xcon.schema.json` and schema generation tests
- `site/llms-full.txt`
- prompt contracts that mention `networkDiagram`

Docs should clearly distinguish standard `links` from compatibility-only `edges`, explain the default `obsidian` theme, and state that public viewer interactions are local-only and do not execute actions.
