# XCON Template Studio Design

## Goal

Build a new Figma plugin named `XCON Template Studio` that turns Markdown-based XCON template documents into native Figma nodes. The plugin applies the `template-lab.html` workflow inside Figma: edit a Markdown template, edit fixture JSON, resolve `xcon-chain` variables, preview `xcon-sketch` blocks, inspect diagnostics, and insert resolved SKETCH blocks into the current Figma page or selected frame.

## Scope

The first version is intentionally local and public-runtime-only.

- Include a plugin UI with `Template` and `Fixture JSON` source tabs.
- Include output tabs for `Preview`, `Inspect`, and `Resolved Source`.
- Support Markdown prose, `xcon-chain` fenced blocks, and `xcon-sketch` fenced blocks.
- Store `xcon-chain` aliases in the template environment and replace `$alias` references in later Markdown and SKETCH blocks.
- Render resolved SKETCH blocks in the UI with the public XCON viewer runtime.
- Insert one selected SKETCH block or all resolved SKETCH blocks into Figma as native nodes using the existing public `xcon-to-figma` renderer.
- Show diagnostics for invalid fixture JSON, chain evaluation failures, SKETCH parse failures, and insertion failures.

The first version does not include FTX upload, app generation, beta plugin metadata systems, account login, server sync, or full Figma-to-template round trip. Figma selection export can be added after the document-to-design flow is working.

## Architecture

Create a new plugin folder at `figma-plugins/xcon-template-studio`.

The UI owns template rendering because it can safely bundle browser runtimes and render HTML previews. The Figma main thread owns native node creation because only plugin code can call the Figma Plugin API. The UI sends plain resolved XCON JSON trees to the main thread; the main thread passes those trees to the existing `XconSketchFigmaRenderer.insertTree`.

The plugin reuses proven public pieces instead of beta code:

- `@xcon-viewer/core` for SKETCH parsing and serialization.
- `@xcon-viewer/viewer` for HTML preview.
- `@xcon-chain/core` for SUGAR/chain evaluation.
- `figma-plugins/xcon-to-figma/src/xcon-normalize.js` and `figma-xcon-renderer.js` for native Figma node creation.

## Components

### Template Engine

`src/template-engine.js` exposes browser globals for tests and UI:

- `createTemplateStudioEngine(modules)`
- `renderTemplateDocument(templateText, fixtureData)`
- `applyVars(value, vars)`
- `parseFenceInfo(info)`

It parses Markdown fenced blocks with language names and optional aliases. Supported block languages are `xcon-chain`, `chain`, `sugar`, `xcon-sketch`, and `sketch`.

### UI

`src/ui-template.html` is a static Figma UI:

- Left side source editor with tabs for template and fixture JSON.
- Right side output with tabs for preview, inspect, and resolved source.
- A block list for resolved SKETCH blocks.
- Actions: render, reset preset, format JSON, insert selected block, insert all blocks, copy resolved source.

Textarea editors are sufficient for the first version. Monaco is not required for this plugin MVP.

### Main Thread

`src/code-entry.js`:

- Opens the UI.
- Tracks the current selection as the insertion target.
- Handles `ready`, `close`, `insert-template-block`, and `insert-template-blocks`.
- Calls `XconSketchFigmaRenderer.insertTree` for each tree.
- Posts insertion status back to the UI.

### Build

`scripts/build-plugin.cjs` bundles public browser runtime into `ui.html` with esbuild and concatenates the existing normalizer/renderer with the new main entry into `code.js`.

## Error Handling

The template engine returns structured diagnostics instead of throwing for document-level failures. Fatal parsing problems in one fenced block do not stop the rest of the template from rendering.

The UI shows:

- fixture JSON parse errors,
- chain evaluation errors,
- SKETCH parse/render errors,
- insert success/failure messages.

The main thread validates that each insert message contains at least one object tree before calling the renderer.

## Testing

Use Node's built-in test runner for plugin source checks and the template engine.

Test coverage:

- `xcon-chain as alias` stores variables and replaces `$alias` in later SKETCH blocks.
- multiple SKETCH fences produce separate insertable blocks.
- invalid fixture JSON and invalid SKETCH produce diagnostics instead of crashing the whole render.
- build script is wired to public `@xcon-viewer/*` and `@xcon-chain/core`, not the beta Xamong runtime.
- main entry sends insert requests to `insertTree` for selected/all blocks.

Manual Figma verification remains necessary for visual insertion because the Figma Plugin API is not available in Node.
