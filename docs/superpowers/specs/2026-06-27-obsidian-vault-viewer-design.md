# Obsidian-Style Vault Viewer Test Design

## Context

`xcon-viewer` already has three pieces that make an Obsidian-style Markdown/Vault/Network Viewer practical:

- `site/markdown-viewer.html` renders Markdown through the self-hosted `markdown-it` browser bundle.
- `@xcon-viewer/markdown-it` renders safe XCON fences inside Markdown.
- `networkDiagram` now has an Obsidian-like D3 runtime with search, filters, hover, drag, zoom, fit/reset, static fallback markup, and full-version graph data compatibility.

The first vault viewer should prove the product shape without adding filesystem access, a new npm package, or a new public XCON component. The demo is a static analysis test page that can later be promoted into a reusable runtime or package.

## Goals

- Add a static sample-vault test page that demonstrates an Obsidian-style Markdown/Vault/Network Viewer.
- Use a workbench layout: vault navigation on the left, Markdown reader in the center, analysis and graph on the right.
- Support analysis features strong enough to feel like a real vault viewer: wikilinks, backlinks, tags, frontmatter, aliases, unresolved links, orphan notes, search, filters, global graph, and selected-note local graph.
- Reuse existing project patterns for public site test pages and bundled local runtime files.
- Keep the first implementation browser-only and deterministic.
- Keep the design expandable toward browser folder selection or a future reusable package.

## Non-Goals

- Do not read an actual local Obsidian vault in this phase.
- Do not use the File System Access API in this phase.
- Do not create a new npm package.
- Do not add a new `vaultViewer` XCON component yet.
- Do not persist edits or support Markdown editing.
- Do not execute Markdown HTML, user JavaScript, Obsidian plugins, Dataview queries, Templater scripts, or arbitrary plugin code.
- Do not target full Obsidian feature parity.

## Chosen Approach

Create an independent test page:

- `site/obsidian-vault-viewer-test.html`
- `site/obsidian-vault-viewer-test-runtime.js`

This follows the existing `network-diagram-test.html` and `advanced-visualization-test.html` pattern. The page is included in public site build/test coverage, but it is treated as an experimental test page rather than a primary navigation item.

The page runtime owns the static sample vault, indexing, Markdown rendering, relationship analysis, and UI state. Shared viewer packages are not expanded during this phase.

## Architecture

The demo is split into focused browser-side units inside the runtime:

- `vaultSamples`
  - Static Markdown notes used by the demo.
  - Each note has `path`, `title`, `body`, and optional `frontmatter`.

- `vaultIndexer`
  - Converts sample notes into an indexed vault model.
  - Extracts frontmatter, headings, aliases, tags, wikilinks, backlinks, unresolved links, and orphan notes.

- `markdownRenderer`
  - Uses the existing self-hosted `markdown-it` browser bundle with `html: false`.
  - Converts resolved and unresolved wikilinks into safe clickable anchors.
  - May later plug in `@xcon-viewer/markdown-it` for XCON fences, but the first test focuses on vault navigation.

- `graphAdapter`
  - Converts the indexed vault into the existing `networkDiagram`-compatible `{ nodes, links, groups }` shape.
  - Supports both global graph and selected-note local graph.

- `workbenchUi`
  - Owns page state: selected note, query, tag filter, issue filter, graph scope, and active link.
  - Synchronizes file list, Markdown reader, backlinks, outgoing links, metadata, issue lists, and graph.

This keeps the prototype easy to reason about while leaving clear seams for future extraction into `@xcon-viewer/viewer` or a separate vault package.

## Data Model

Sample notes use this shape:

```ts
type VaultSampleNote = {
  path: string;
  title: string;
  body: string;
  frontmatter?: Record<string, unknown>;
};
```

The indexer produces:

```ts
type VaultIndex = {
  notes: Map<string, IndexedNote>;
  links: VaultLink[];
  backlinks: Map<string, VaultLink[]>;
  tags: Map<string, string[]>;
  unresolvedLinks: UnresolvedLink[];
  orphanNoteIds: Set<string>;
  diagnostics: VaultDiagnostic[];
};
```

Rules:

- Note ids are normalized paths.
- `[[Target]]` resolves by title, alias, then path basename.
- `[[Target|Label]]` resolves `Target`; `Label` is display text only.
- Tags come from body `#tag` tokens and frontmatter `tags`.
- Frontmatter parsing is intentionally simple: demo-oriented key/value/list support, not a full YAML implementation.
- Duplicate titles or aliases use deterministic first-path wins behavior and produce diagnostics.
- Unresolved links are analysis results, not fatal errors.
- Orphan notes have no inbound and no outbound resolved links.
- Graph group is `frontmatter.area`, then top-level folder, then `notes`.

The first sample vault should include 10-14 notes covering:

- `XCON Viewer`
- `Network Diagram`
- `Markdown Renderer`
- `Sprint 3`
- `Security Model`
- `Publishing`
- `Obsidian Graph`
- `Vault Index`
- `Unresolved Idea`
- `Orphan Note`

## UI

Use the approved Workbench Layout.

Left sidebar:

- Search input.
- File list.
- Tag filters.
- Analysis section for unresolved links and orphan notes.
- Active filters as compact chips.

Center reader:

- Selected note title, path, and frontmatter badges.
- Rendered Markdown.
- Clickable resolved `[[wikilinks]]`.
- Warning style for unresolved wikilinks.
- Heading outline near the top of the document or inside the right metadata panel.

Right analysis panel:

- Selected-note local graph.
- Toggle for global graph versus selected-note graph.
- Backlinks.
- Outgoing links.
- Aliases, tags, status, and area.
- Diagnostics for duplicate aliases/titles when present.

Responsive behavior:

- Desktop uses the three-column workbench.
- Narrow screens stack vault navigation, reader, and analysis panels vertically.
- Text must not overlap controls or graph labels at common mobile and desktop widths.

## Graph Behavior

The test page uses the existing visual language of `networkDiagram`.

- Node click selects the corresponding note.
- Search and tag filters affect both the file list and graph.
- Global graph shows all notes plus unresolved target nodes.
- Local graph shows selected note, backlinks, outgoing links, and one-hop unresolved targets.
- Unresolved nodes use a muted dashed style.
- Orphan notes use a distinct group/color.
- If graph hydration fails, the page continues to show Markdown, lists, and a static relationship summary.

## Safety

- Markdown rendering uses `markdown-it` with `html: false`.
- Wikilink rendering is based on escaped text and controlled anchor generation.
- No external scripts or CDN dependencies are introduced.
- No Obsidian plugin execution is supported.
- Frontmatter parse failures attach warnings to the note instead of failing the whole page.
- User-controlled sample text is escaped before insertion into attributes or HTML.
- Graph metadata is rendered as text only.

## Testing

Extend `scripts/site-structure.test.mjs` to verify:

- The test page exists.
- The bundled runtime exists.
- `scripts/build-public-site.mjs` copies both files.
- The page references the local runtime and self-hosted `markdown-it` bundle.
- The page does not import from npm package specifiers in the browser.
- The page contains expected sample vault concepts, including wikilinks, backlinks, unresolved links, orphan notes, aliases, and tags.
- The runtime contains indexer functions and graph conversion functions.
- The public route resolver can serve the test page if it is registered as an extra route.

Manual verification:

- Open the test page from the local static server.
- Select notes from the file list.
- Click resolved wikilinks in Markdown.
- Confirm unresolved wikilinks are styled as warnings.
- Apply search and tag filters.
- Switch global/local graph scope.
- Click graph nodes to select notes.
- Confirm backlinks, outgoing links, metadata, and analysis lists update.
- Check mobile-width layout.

## Future Expansion

After the test page proves the UX, future phases can choose among:

- Browser folder selection through the File System Access API.
- A reusable `vaultViewer` runtime inside `@xcon-viewer/viewer`.
- A separate package such as `@xcon-viewer/vault-viewer`.
- Optional XCON fence rendering inside vault notes through the existing Markdown plugin.
- Export/import of a normalized vault JSON model.

## Acceptance Criteria

- A user can open the test page and immediately see an Obsidian-style workbench.
- The sample vault shows real relationships rather than placeholder content.
- Wikilinks, backlinks, tags, aliases, unresolved links, orphan notes, and graph selection are all visible.
- The page works without external network access beyond the local static server.
- Existing public viewer security expectations remain intact.
- Site structure tests cover the new page and runtime.
