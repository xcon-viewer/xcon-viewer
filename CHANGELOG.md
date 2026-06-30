# Changelog

## 0.2.1

### Added
- Added dedicated `networkDiagram` feature documentation covering data compatibility, interaction behavior, security boundaries, runtime dependencies, and test pages.

### Fixed
- Fixed `networkDiagram` wheel zoom anchoring so zoom now uses the mouse position inside the SVG viewport instead of the browser viewport coordinate.
- Refreshed the standalone network diagram and advanced visualization browser runtime bundles after the zoom fix.

## 0.2.0

### Added
- Added D3/Observable Plot-backed advanced visualization hydration for public `dataViz` documents with `vizType` values `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, and `plot`.
- Added the required `@xcon-viewer/viewer` runtime dependency set: `d3`, `d3-hierarchy`, `d3-sankey`, `d3-force`, `d3-chord`, and `@observablehq/plot`, with type-only development support from `@types/d3` and `@types/d3-sankey`.
- Added public documentation for the advanced visualization dependency model, including the split between bundled npm dependencies and optional Leaflet browser CDN resources.

### Fixed
- Restored the standalone `network-diagram-test.html` page with the three richer network samples and refreshed the advanced visualization browser runtime bundle so network controls use the intended D3 graph styling.

## 0.1.7

### Added
- Added opt-in Leaflet/OpenStreetMap hydration for the public `map` component via `provider "leaflet"` when external resources are allowed, while preserving the safe static fallback by default.
- Added public `map` support for `heatmap`, `polylines`, `polygons`, `clustering`, and `markerIcons` properties so richer geographic documents can preserve route, region, density, and marker metadata through SKETCH, schema validation, and Leaflet hydration.
- Added static `dataViz` previews for treemap, sunburst, and force graph documents so D3-style analytical artifacts render useful SVG output even before an optional interactive runtime is attached.

### Fixed
- Added lenient XCON/SKETCH parsing for Markdown and Remark rendering paths so recoverable local SKETCH errors no longer block the entire preview.
- Added SKETCH parse diagnostics for partially rendered Markdown/Remark fences, allowing valid components to render while skipped invalid blocks are reported as warnings.
- Added the same recoverable SKETCH parsing and diagnostics behavior to the core viewer APIs and `<xcon-viewer>` string input path.
- Applied the same recoverable SKETCH rendering and diagnostics behavior to the XconViewer Desk Markdown pane.
- Added the public `line` document primitive for SKETCH/JSON dividers, absolute-coordinate arrows, labels, schema validation, and safe SVG rendering.
- Added anchor-based `connector` rendering plus the SKETCH compatibility form `arrow from source anchor to target anchor` for document flow diagrams.

## 0.1.6

### Changed
- Consolidated release jump from 0.1.2 directly to 0.1.6 (no public `0.1.3~0.1.5` artifacts were published in this sequence).
- Synchronized package metadata to release `0.1.6` across root + all `@xcon-viewer/*` packages (`core`, `viewer`, `cli`, `document-importer`, `github-action`, `markdown-it`, `react`, `remark`, `vite-plugin`, `vue`).
- Repaired `package-lock.json` metadata consistency for the root package entry (workspace version now reflects `0.1.6`).
- Updated public docs/snippets that still referenced prior tags (`v0.1.5`) including README, API page, and integration docs.
- Added a dedicated release procedure document for GitHub + npm publishing.

### Fixed
- Removed release-time ambiguity from package references (previously mixed tag references could point to older package versions).

## 0.1.3

### Changed
- Aligned all published package versions (`packages/*` and root) to `0.1.3`.
- Bumped inter-package dependencies to `0.1.3` for workspace consistency.
- Updated `package-lock.json` workspace metadata accordingly.
- Refreshed CDN/snippet and GitHub Action docs/examples to reference `v0.1.3`.
- Updated public deployment documentation with versioned release flow (Git tag + npm publish order).

## 0.1.2

### Fixed
- Improved public viewer layout parity for XCON/SKETCH rendering across playground, markdown preview, and standalone preview tools.
- Fixed markdown XCON fence sizing so small `screen` documents render without unnecessary scrollbars.
- Improved public list rendering for `dataTemplate` rows with `templates.cell` layouts.

## 0.1.1

### Fixed
- Fixed XCON/SKETCH parsing for multiline JSON property values such as `slides [` and `dataTemplate {`.
- Updated the public runtime bundle used by draft/public SKETCH preview tools.

## 0.1.0

### Added
- Initial public packages for XCON Viewer.
