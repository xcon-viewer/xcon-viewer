# Obsidian Vault Viewer Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Obsidian-style Markdown/Vault/Network Viewer test page with sample vault data, wikilinks, backlinks, tags, unresolved links, orphan notes, and global/local graph views.

**Architecture:** Add an independent public-site test page and local runtime under `site/`. The runtime owns the sample vault, indexing, Markdown rendering, graph conversion, and workbench state; it reuses the existing bundled `network-diagram-test-runtime.js` for XCON parsing/rendering and D3 `networkDiagram` hydration. Register the page in route/build/test infrastructure without creating a new package or XCON component.

**Tech Stack:** HTML, CSS, browser ESM, self-hosted `markdown-it`, existing `@xcon-viewer/core`/`@xcon-viewer/viewer` bundled test runtime, Vitest site-structure tests.

---

## Scope Check

This is one subsystem: a static public-site test page for an Obsidian-style vault viewer. It does not introduce local filesystem access, persistence, a new package, or a new public component. The plan keeps the implementation demo-oriented but splits the browser runtime into named functions so indexer and graph adapter logic can later be extracted.

## File Structure

- Create `site/obsidian-vault-viewer-test.html`
  - Workbench shell, styles, local `markdown-it` browser bundle script, and runtime bootstrap.
- Create `site/obsidian-vault-viewer-test-runtime.js`
  - Static sample vault, indexer helpers, Markdown/wikilink rendering, UI rendering, interaction wiring, and graph adapter.
- Modify `scripts/site-routes.mjs`
  - Register `/obsidian-vault-viewer-test.html` as an extra route.
- Modify `scripts/build-public-site.mjs`
  - Copy the test page and runtime into `dist-site`.
- Modify `scripts/site-structure.test.mjs`
  - Verify routing, build copies, local runtime usage, sample vault concepts, and runtime function exports.

## Task 1: Add Failing Site Test For The Vault Viewer Page

**Files:**
- Modify: `scripts/site-structure.test.mjs`

- [ ] **Step 1: Add the failing site-structure test**

Add this test after the standalone network diagram test in `scripts/site-structure.test.mjs`:

```js
  test('serves the obsidian vault viewer test page with static vault analysis runtime', () => {
    const pagePath = join(rootDir, 'site', 'obsidian-vault-viewer-test.html');
    const runtimePath = join(rootDir, 'site', 'obsidian-vault-viewer-test-runtime.js');
    const buildScript = readFileSync(join(rootDir, 'scripts', 'build-public-site.mjs'), 'utf8');

    expect(resolvePublicPath('/obsidian-vault-viewer-test.html')).toBe(pagePath);
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(runtimePath)).toBe(true);
    expect(contentTypeForPath(runtimePath)).toBe('text/javascript; charset=utf-8');

    const page = readFileSync(pagePath, 'utf8');
    const runtime = readFileSync(runtimePath, 'utf8');

    expect(page).toContain('Obsidian Vault Viewer Test');
    expect(page).toContain('id="vaultWorkbench"');
    expect(page).toContain('src="/vendor/markdown-it/markdown-it.min.js"');
    expect(page).toContain("from '/site/obsidian-vault-viewer-test-runtime.js'");
    expect(page).not.toContain('@xcon-viewer/viewer');
    expect(page).not.toContain('@xcon-viewer/core');
    expect(page).not.toContain('https://cdn');

    expect(runtime).toContain("from '/site/network-diagram-test-runtime.js'");
    expect(runtime).toContain('export const vaultSamples');
    expect(runtime).toContain('export function createVaultIndex');
    expect(runtime).toContain('export function graphFromVaultIndex');
    expect(runtime).toContain('export function localGraphForNote');
    expect(runtime).toContain('export function mountObsidianVaultViewer');
    expect(runtime).toContain('[[Network Diagram]]');
    expect(runtime).toContain('[[Missing Plugin Idea]]');
    expect(runtime).toContain('Orphan Note');
    expect(runtime).toContain('#graph');
    expect(runtime).toContain('aliases');
    expect(runtime).toContain('unresolvedLinks');
    expect(runtime).toContain('orphanNoteIds');

    expect(buildScript).toContain("['site/obsidian-vault-viewer-test.html', 'obsidian-vault-viewer-test.html']");
    expect(buildScript).toContain("['site/obsidian-vault-viewer-test.html', 'site/obsidian-vault-viewer-test.html']");
    expect(buildScript).toContain("['site/obsidian-vault-viewer-test-runtime.js', 'site/obsidian-vault-viewer-test-runtime.js']");
  });
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```powershell
npx vitest run scripts/site-structure.test.mjs -t "obsidian vault viewer"
```

Expected: FAIL because `resolvePublicPath('/obsidian-vault-viewer-test.html')` returns `null` and the page/runtime files do not exist yet.

## Task 2: Register The Page And Add The Workbench HTML Shell

**Files:**
- Modify: `scripts/site-routes.mjs`
- Modify: `scripts/build-public-site.mjs`
- Create: `site/obsidian-vault-viewer-test.html`

- [ ] **Step 1: Register the public test route**

In `scripts/site-routes.mjs`, add this entry to `extraRoutes` immediately after `network-diagram-test.html`:

```js
  { path: '/obsidian-vault-viewer-test.html', file: 'site/obsidian-vault-viewer-test.html' },
```

- [ ] **Step 2: Register public site copies**

In `scripts/build-public-site.mjs`, add these entries after the network diagram test runtime copy:

```js
  ['site/obsidian-vault-viewer-test.html', 'obsidian-vault-viewer-test.html'],
  ['site/obsidian-vault-viewer-test.html', 'site/obsidian-vault-viewer-test.html'],
  ['site/obsidian-vault-viewer-test-runtime.js', 'site/obsidian-vault-viewer-test-runtime.js'],
```

- [ ] **Step 3: Create the HTML shell**

Create `site/obsidian-vault-viewer-test.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Obsidian Vault Viewer Test - XCON Viewer</title>
  <style>
    :root {
      color-scheme: dark;
      --vault-bg: #0f1117;
      --vault-panel: #151923;
      --vault-panel-2: #10141d;
      --vault-panel-3: #1d2430;
      --vault-line: #2a3240;
      --vault-line-2: #364154;
      --vault-ink: #e5e7eb;
      --vault-muted: #9ca3af;
      --vault-faint: #6b7280;
      --vault-accent: #8b5cf6;
      --vault-blue: #38bdf8;
      --vault-green: #22c55e;
      --vault-yellow: #f59e0b;
      --vault-red: #fb7185;
      --vault-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--vault-bg); color: var(--vault-ink); }
    button, input { font: inherit; }

    .vault-app {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      background:
        radial-gradient(circle at 16% 10%, rgba(139, 92, 246, 0.18), transparent 24%),
        radial-gradient(circle at 82% 6%, rgba(56, 189, 248, 0.12), transparent 26%),
        var(--vault-bg);
    }

    .vault-topbar {
      min-height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 18px;
      border-bottom: 1px solid var(--vault-line);
      background: rgba(15, 17, 23, 0.86);
      backdrop-filter: blur(16px);
    }

    .vault-title { min-width: 0; }
    .vault-title h1 { margin: 0; font-size: 18px; line-height: 1.2; letter-spacing: 0; }
    .vault-title p { margin: 4px 0 0; color: var(--vault-muted); font-size: 12px; }

    .vault-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .vault-pill {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.66);
      color: var(--vault-ink);
      padding: 0 9px;
      font-size: 11px;
      font-weight: 800;
    }

    .vault-shell {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(240px, 300px) minmax(420px, 1fr) minmax(300px, 390px);
      gap: 1px;
      background: var(--vault-line);
    }

    .vault-sidebar, .vault-reader, .vault-analysis {
      min-width: 0;
      min-height: 0;
      background: rgba(16, 20, 29, 0.96);
      overflow: auto;
    }

    .vault-sidebar, .vault-analysis { padding: 14px; }
    .vault-reader { padding: 0; }

    .vault-search {
      width: 100%;
      height: 36px;
      border: 1px solid var(--vault-line-2);
      border-radius: 8px;
      background: #0c1018;
      color: var(--vault-ink);
      outline: none;
      padding: 0 11px;
      font-size: 13px;
      font-weight: 650;
    }

    .vault-section { margin-top: 16px; }
    .vault-section h2 {
      margin: 0 0 8px;
      color: var(--vault-muted);
      font-size: 11px;
      line-height: 1.2;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .vault-list { display: grid; gap: 6px; }
    .vault-note-button, .vault-chip, .vault-toggle {
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(30, 36, 48, 0.72);
      color: var(--vault-ink);
      cursor: pointer;
    }

    .vault-note-button {
      width: 100%;
      min-height: 42px;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: left;
    }

    .vault-note-button.active { border-color: rgba(139, 92, 246, 0.72); background: rgba(139, 92, 246, 0.18); }
    .vault-note-title { display: block; font-size: 13px; font-weight: 850; line-height: 1.25; }
    .vault-note-path { display: block; margin-top: 3px; color: var(--vault-muted); font-size: 11px; overflow-wrap: anywhere; }

    .vault-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .vault-chip, .vault-toggle {
      min-height: 28px;
      border-radius: 999px;
      padding: 0 9px;
      font-size: 11px;
      font-weight: 800;
    }

    .vault-chip.active, .vault-toggle.active { border-color: rgba(56, 189, 248, 0.66); background: rgba(56, 189, 248, 0.18); }
    .vault-chip.warning { border-color: rgba(251, 113, 133, 0.48); background: rgba(251, 113, 133, 0.12); color: #fecdd3; }

    .vault-document {
      max-width: 860px;
      margin: 0 auto;
      padding: 30px 34px 70px;
    }

    .vault-document-header {
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vault-line);
      margin-bottom: 24px;
    }

    .vault-document-header h2 { margin: 0; font-size: 30px; line-height: 1.15; letter-spacing: 0; }
    .vault-document-path { margin-top: 7px; color: var(--vault-muted); font-size: 12px; overflow-wrap: anywhere; }
    .vault-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

    .vault-markdown { color: #d7dce7; font-size: 15px; line-height: 1.75; }
    .vault-markdown h1, .vault-markdown h2, .vault-markdown h3 { line-height: 1.24; letter-spacing: 0; }
    .vault-markdown h1 { font-size: 26px; }
    .vault-markdown h2 { margin-top: 1.6em; font-size: 22px; }
    .vault-markdown h3 { margin-top: 1.4em; font-size: 18px; }
    .vault-markdown code { border-radius: 5px; background: rgba(139, 92, 246, 0.14); color: #ddd6fe; padding: 2px 5px; }
    .vault-markdown pre { overflow: auto; border: 1px solid var(--vault-line); border-radius: 8px; background: #0b1020; padding: 14px; }
    .vault-markdown a, .vault-wikilink { color: #93c5fd; text-decoration: none; border-bottom: 1px solid rgba(147, 197, 253, 0.42); cursor: pointer; }
    .vault-wikilink.unresolved { color: #fda4af; border-bottom-color: rgba(253, 164, 175, 0.54); }

    .vault-card {
      border: 1px solid var(--vault-line);
      border-radius: 8px;
      background: rgba(15, 19, 28, 0.78);
      box-shadow: var(--vault-shadow);
      overflow: hidden;
    }

    .vault-card + .vault-card { margin-top: 12px; }
    .vault-card-head { padding: 10px 12px; border-bottom: 1px solid var(--vault-line); color: var(--vault-muted); font-size: 11px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
    .vault-card-body { padding: 12px; }
    .vault-graph-host { height: 260px; min-height: 260px; }
    .vault-link-list { display: grid; gap: 7px; }
    .vault-link-item { border: 1px solid rgba(148, 163, 184, 0.14); border-radius: 7px; background: rgba(30, 36, 48, 0.52); padding: 8px; color: var(--vault-ink); font-size: 12px; cursor: pointer; text-align: left; }
    .vault-empty { color: var(--vault-faint); font-size: 12px; line-height: 1.5; }

    @media (max-width: 1080px) {
      .vault-shell { grid-template-columns: 260px minmax(0, 1fr); }
      .vault-analysis { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .vault-analysis .vault-card { margin-top: 0; }
    }

    @media (max-width: 760px) {
      .vault-topbar { align-items: flex-start; flex-direction: column; }
      .vault-stats { justify-content: flex-start; }
      .vault-shell { grid-template-columns: 1fr; }
      .vault-analysis { display: block; }
      .vault-analysis .vault-card + .vault-card { margin-top: 12px; }
      .vault-document { padding: 24px 18px 54px; }
      .vault-document-header h2 { font-size: 25px; }
    }
  </style>
</head>
<body>
  <main class="vault-app">
    <header class="vault-topbar">
      <div class="vault-title">
        <h1>Obsidian Vault Viewer Test</h1>
        <p>Static sample vault with Markdown, wikilinks, backlinks, tags, unresolved links, orphan notes, and graph analysis.</p>
      </div>
      <div id="vaultStats" class="vault-stats" aria-label="Vault statistics"></div>
    </header>
    <section id="vaultWorkbench" class="vault-shell" aria-label="Obsidian-style vault workbench"></section>
  </main>

  <script src="/vendor/markdown-it/markdown-it.min.js"></script>
  <script type="module">
    import { mountObsidianVaultViewer } from '/site/obsidian-vault-viewer-test-runtime.js';

    const root = document.getElementById('vaultWorkbench');
    const stats = document.getElementById('vaultStats');
    mountObsidianVaultViewer(root, { statsTarget: stats });
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the targeted test and verify remaining failure**

Run:

```powershell
npx vitest run scripts/site-structure.test.mjs -t "obsidian vault viewer"
```

Expected: FAIL because `site/obsidian-vault-viewer-test-runtime.js` does not exist yet.

## Task 3: Implement Static Vault Samples And Indexer Runtime

**Files:**
- Create: `site/obsidian-vault-viewer-test-runtime.js`

- [ ] **Step 1: Create runtime imports and sample vault**

Create `site/obsidian-vault-viewer-test-runtime.js` with this top section:

```js
import { parseBySyntax, render, viewerCss } from '/site/network-diagram-test-runtime.js';

export const vaultSamples = [
  {
    path: '00 Home/XCON Viewer.md',
    title: 'XCON Viewer',
    frontmatter: { status: 'active', area: 'viewer', aliases: ['Public Viewer'], tags: ['viewer', 'xcon'] },
    body: `# XCON Viewer

XCON Viewer is the public Markdown-facing renderer for safe XCON documents.

It connects [[Markdown Renderer]], [[Network Diagram]], [[Security Model]], and [[Publishing]] into one public package surface.

The current workbench explores an [[Obsidian Graph]] experience for #viewer and #graph analysis.
`,
  },
  {
    path: '01 Runtime/Network Diagram.md',
    title: 'Network Diagram',
    frontmatter: { status: 'active', area: 'runtime', aliases: ['D3 Graph', 'Graph Runtime'], tags: ['graph', 'runtime'] },
    body: `# Network Diagram

The network diagram uses D3 hydration to render dense relationship maps.

It is used by [[Obsidian Graph]], [[Vault Index]], and [[Sprint 3]].

Related unresolved idea: [[Missing Plugin Idea]].
`,
  },
  {
    path: '01 Runtime/Markdown Renderer.md',
    title: 'Markdown Renderer',
    frontmatter: { status: 'stable', area: 'markdown', aliases: ['Markdown Preview'], tags: ['markdown', 'viewer'] },
    body: `# Markdown Renderer

The Markdown renderer uses a local markdown-it browser bundle with raw HTML disabled.

It can render links to [[XCON Viewer]] and analysis notes like [[Vault Index]].

## Rendering Constraints

- Keep HTML disabled.
- Turn wikilinks into controlled anchors.
- Keep XCON fence support as a later extension.
`,
  },
  {
    path: '02 Planning/Sprint 3.md',
    title: 'Sprint 3',
    frontmatter: { status: 'done', area: 'planning', tags: ['planning', 'visualization'] },
    body: `# Sprint 3

Sprint 3 expanded advanced visualizations.

It included [[Network Diagram]], dataViz components, map layers, and publishing documentation.

The release path is tracked in [[Publishing]].
`,
  },
  {
    path: '03 Security/Security Model.md',
    title: 'Security Model',
    frontmatter: { status: 'required', area: 'security', aliases: ['Viewer Safety'], tags: ['security', 'viewer'] },
    body: `# Security Model

The public viewer blocks executable actions and unsafe HTML.

This affects [[Markdown Renderer]], [[Network Diagram]], and [[Publishing]].

Security review also calls out [[Missing Plugin Idea]] as intentionally unresolved.
`,
  },
  {
    path: '04 Release/Publishing.md',
    title: 'Publishing',
    frontmatter: { status: 'ready', area: 'release', tags: ['release', 'npm'] },
    body: `# Publishing

Publishing covers npm package checks, build verification, and CHANGELOG updates.

It depends on [[Sprint 3]], [[Security Model]], and [[XCON Viewer]].
`,
  },
  {
    path: '05 Research/Obsidian Graph.md',
    title: 'Obsidian Graph',
    frontmatter: { status: 'research', area: 'analysis', aliases: ['Graph View'], tags: ['graph', 'vault'] },
    body: `# Obsidian Graph

The graph view should reveal relationships between notes, tags, and unresolved references.

It depends on [[Vault Index]] and visual behavior from [[Network Diagram|D3 graph runtime]].
`,
  },
  {
    path: '05 Research/Vault Index.md',
    title: 'Vault Index',
    frontmatter: { status: 'prototype', area: 'analysis', aliases: ['Index Model'], tags: ['vault', 'markdown'] },
    body: `# Vault Index

The vault index resolves [[XCON Viewer]], [[Markdown Preview]], aliases, tags, backlinks, and orphan notes.

It also records unresolved references such as [[Missing Plugin Idea]].
`,
  },
  {
    path: '05 Research/Unresolved Idea.md',
    title: 'Unresolved Idea',
    frontmatter: { status: 'draft', area: 'analysis', tags: ['draft'] },
    body: `# Unresolved Idea

This note intentionally points at [[Missing Plugin Idea]] so the demo can show unresolved links.

It also links back to [[Obsidian Graph]].
`,
  },
  {
    path: '99 Archive/Orphan Note.md',
    title: 'Orphan Note',
    frontmatter: { status: 'archived', area: 'archive', aliases: ['Lonely Note'], tags: ['archive'] },
    body: `# Orphan Note

This note intentionally has no resolved inbound or outbound links.

It exists so the analysis panel can surface orphan notes.
`,
  },
];
```

- [ ] **Step 2: Add indexer helpers**

Append these functions to `site/obsidian-vault-viewer-test-runtime.js`:

```js
export function createVaultIndex(samples = vaultSamples) {
  const notes = new Map();
  const titleIndex = new Map();
  const aliasIndex = new Map();
  const diagnostics = [];

  for (const sample of samples) {
    const id = normalizeNoteId(sample.path);
    const parsed = parseFrontmatter(sample.body, sample.frontmatter);
    const note = {
      id,
      path: sample.path,
      title: sample.title,
      body: parsed.body,
      frontmatter: parsed.frontmatter,
      aliases: normalizeStringArray(parsed.frontmatter.aliases),
      tags: uniqueStrings([...normalizeStringArray(parsed.frontmatter.tags), ...extractBodyTags(parsed.body)]),
      headings: extractHeadings(parsed.body),
      links: extractWikiLinks(parsed.body),
      warnings: parsed.warnings,
    };
    notes.set(id, note);
    addIndex(titleIndex, normalizeLookupKey(note.title), id, diagnostics, 'title', note.title);
    for (const alias of note.aliases) addIndex(aliasIndex, normalizeLookupKey(alias), id, diagnostics, 'alias', alias);
  }

  const links = [];
  const unresolvedLinks = [];
  const backlinks = new Map(Array.from(notes.keys(), (id) => [id, []]));
  const tags = new Map();

  for (const note of notes.values()) {
    for (const tag of note.tags) {
      const key = tag.toLowerCase();
      tags.set(key, [...(tags.get(key) || []), note.id]);
    }
    for (const rawLink of note.links) {
      const targetId = resolveWikiTarget(rawLink.target, notes, titleIndex, aliasIndex);
      const link = {
        source: note.id,
        target: targetId,
        rawTarget: rawLink.target,
        label: rawLink.label,
        resolved: Boolean(targetId),
        type: targetId ? 'wiki' : 'unresolved',
      };
      links.push(link);
      if (targetId) backlinks.get(targetId).push(link);
      else unresolvedLinks.push({ source: note.id, rawTarget: rawLink.target, label: rawLink.label });
    }
  }

  const connected = new Set();
  for (const link of links) {
    if (!link.resolved) continue;
    connected.add(link.source);
    connected.add(link.target);
  }
  const orphanNoteIds = new Set(Array.from(notes.keys()).filter((id) => !connected.has(id)));

  return { notes, links, backlinks, tags, unresolvedLinks, orphanNoteIds, diagnostics };
}

export function normalizeNoteId(path) {
  return String(path || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

export function parseFrontmatter(body, explicitFrontmatter = {}) {
  const source = String(body || '');
  const warnings = [];
  if (!source.startsWith('---\n')) return { body: source, frontmatter: { ...explicitFrontmatter }, warnings };
  const end = source.indexOf('\n---', 4);
  if (end < 0) {
    warnings.push('Frontmatter start marker exists without a closing marker.');
    return { body: source, frontmatter: { ...explicitFrontmatter }, warnings };
  }
  const block = source.slice(4, end).trim();
  const parsed = { ...explicitFrontmatter };
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      warnings.push(`Ignored frontmatter line: ${line}`);
      continue;
    }
    const [, key, rawValue] = match;
    parsed[key] = parseFrontmatterValue(rawValue);
  }
  return { body: source.slice(source.indexOf('\n', end + 1) + 1), frontmatter: parsed, warnings };
}

function parseFrontmatterValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map((item) => item.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, '');
}

export function extractWikiLinks(body) {
  const links = [];
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  for (const match of String(body || '').matchAll(pattern)) {
    links.push({ target: match[1].trim(), label: (match[2] || match[1]).trim(), index: match.index || 0 });
  }
  return links;
}

export function resolveWikiTarget(rawTarget, notes, titleIndex, aliasIndex) {
  const key = normalizeLookupKey(rawTarget);
  if (titleIndex.has(key)) return titleIndex.get(key);
  if (aliasIndex.has(key)) return aliasIndex.get(key);
  for (const note of notes.values()) {
    const basename = note.path.split('/').pop().replace(/\.md$/i, '');
    if (normalizeLookupKey(basename) === key) return note.id;
  }
  return '';
}

function extractBodyTags(body) {
  const tags = [];
  for (const match of String(body || '').matchAll(/(^|[\s(])#([A-Za-z][A-Za-z0-9/_-]*)/g)) {
    tags.push(match[2]);
  }
  return tags;
}

function extractHeadings(body) {
  return String(body || '').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    return match ? [{ depth: match[1].length, text: match[2].trim() }] : [];
  });
}

function addIndex(index, key, id, diagnostics, kind, value) {
  if (!key) return;
  if (index.has(key) && index.get(key) !== id) {
    diagnostics.push({ type: 'duplicate', kind, value, first: index.get(key), duplicate: id });
    return;
  }
  index.set(key, id);
}

function normalizeLookupKey(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}
```

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node --check site/obsidian-vault-viewer-test-runtime.js
```

Expected: PASS with no output.

- [ ] **Step 4: Run targeted site test and verify remaining failure**

Run:

```powershell
npx vitest run scripts/site-structure.test.mjs -t "obsidian vault viewer"
```

Expected: FAIL because `graphFromVaultIndex`, `localGraphForNote`, and `mountObsidianVaultViewer` are not implemented yet.

## Task 4: Implement Rendering, Interactions, And Graph Adapter

**Files:**
- Modify: `site/obsidian-vault-viewer-test-runtime.js`

- [ ] **Step 1: Add graph adapter functions**

Append this graph adapter code to `site/obsidian-vault-viewer-test-runtime.js`:

```js
export function graphFromVaultIndex(index, state = {}) {
  const visibleNotes = filterNotes(index, state);
  const visibleIds = new Set(visibleNotes.map((note) => note.id));
  const nodes = visibleNotes.map((note) => noteToGraphNode(note, index));
  const links = index.links
    .filter((link) => link.resolved && visibleIds.has(link.source) && visibleIds.has(link.target))
    .map((link) => ({
      source: link.source,
      target: link.target,
      type: 'wiki',
      label: link.label,
      weight: 1,
      metadata: { rawTarget: link.rawTarget },
    }));

  for (const unresolved of index.unresolvedLinks) {
    if (!visibleIds.has(unresolved.source)) continue;
    const unresolvedId = `unresolved:${unresolved.rawTarget}`;
    nodes.push({
      id: unresolvedId,
      label: unresolved.rawTarget,
      type: 'unresolved',
      group: 'unresolved',
      color: '#fb7185',
      metadata: { unresolved: true },
    });
    links.push({ source: unresolved.source, target: unresolvedId, type: 'unresolved', label: unresolved.label, weight: 0.35, metadata: {} });
  }

  return { nodes, links, groups: graphGroups(nodes), rootNodeId: state.selectedNoteId || nodes[0]?.id, subfolders: {} };
}

export function localGraphForNote(index, noteId) {
  const ids = new Set([noteId]);
  for (const link of index.links) {
    if (!link.resolved) continue;
    if (link.source === noteId) ids.add(link.target);
    if (link.target === noteId) ids.add(link.source);
  }
  const localState = { noteIds: ids };
  return graphFromVaultIndex(index, localState);
}

function noteToGraphNode(note, index) {
  const orphan = index.orphanNoteIds.has(note.id);
  return {
    id: note.id,
    label: note.title,
    type: orphan ? 'orphan' : 'note',
    group: orphan ? 'orphan' : String(note.frontmatter.area || note.path.split('/')[0] || 'notes'),
    color: orphan ? '#f59e0b' : colorForArea(note.frontmatter.area),
    metadata: { path: note.path, status: note.frontmatter.status || '', tags: note.tags },
    isRoot: false,
  };
}

function graphGroups(nodes) {
  const groups = new Map();
  for (const node of nodes) {
    const id = node.group || 'notes';
    if (!groups.has(id)) groups.set(id, { id, label: id, color: node.color, metadata: {} });
  }
  return Array.from(groups.values());
}

function colorForArea(area) {
  const colors = {
    viewer: '#8b5cf6',
    runtime: '#38bdf8',
    markdown: '#22c55e',
    planning: '#f59e0b',
    security: '#fb7185',
    release: '#0ea5e9',
    analysis: '#14b8a6',
    archive: '#64748b',
  };
  return colors[String(area || '')] || '#94a3b8';
}
```

- [ ] **Step 2: Add safe Markdown rendering helpers**

Append this Markdown rendering code:

```js
export function renderMarkdownForNote(markdown, note, index) {
  const prepared = replaceWikilinksWithTokens(note.body, index);
  const html = markdown.render(prepared.source);
  return restoreWikiTokens(html, prepared.tokens);
}

function replaceWikilinksWithTokens(source, index) {
  const tokens = [];
  const body = String(source || '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, rawTarget, rawLabel) => {
    const target = rawTarget.trim();
    const label = (rawLabel || rawTarget).trim();
    const token = `@@VAULT_WIKI_${tokens.length}@@`;
    const targetId = resolveWikiTarget(target, index.notes, titleIndexFromNotes(index.notes), aliasIndexFromNotes(index.notes));
    tokens.push({ token, target, label, targetId });
    return token;
  });
  return { source: body, tokens };
}

function restoreWikiTokens(html, tokens) {
  let output = html;
  for (const token of tokens) {
    const attrs = token.targetId
      ? `href="#" class="vault-wikilink" data-vault-link="${escapeAttr(token.targetId)}"`
      : `href="#" class="vault-wikilink unresolved" data-vault-unresolved="${escapeAttr(token.target)}"`;
    output = output.replaceAll(token.token, `<a ${attrs}>${escapeHtml(token.label)}</a>`);
  }
  return output;
}

function titleIndexFromNotes(notes) {
  return new Map(Array.from(notes.values(), (note) => [normalizeLookupKey(note.title), note.id]));
}

function aliasIndexFromNotes(notes) {
  const aliases = new Map();
  for (const note of notes.values()) {
    for (const alias of note.aliases) aliases.set(normalizeLookupKey(alias), note.id);
  }
  return aliases;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
```

- [ ] **Step 3: Add mount and workbench rendering**

Append this UI code:

```js
export function mountObsidianVaultViewer(root, options = {}) {
  if (!root) throw new Error('mountObsidianVaultViewer requires a root element.');
  const markdownFactory = globalThis.markdownit;
  if (typeof markdownFactory !== 'function') throw new Error('markdown-it browser bundle failed to load.');

  ensureViewerStyle();
  const markdown = markdownFactory({ html: false, linkify: true, typographer: false });
  const index = createVaultIndex(vaultSamples);
  const firstNoteId = index.notes.keys().next().value;
  const state = { selectedNoteId: firstNoteId, query: '', tag: '', issue: '', graphScope: 'local' };

  const rerender = () => renderWorkbench(root, options.statsTarget, markdown, index, state, rerender);
  rerender();
}

function renderWorkbench(root, statsTarget, markdown, index, state, rerender) {
  const selected = index.notes.get(state.selectedNoteId) || index.notes.values().next().value;
  state.selectedNoteId = selected.id;
  if (statsTarget) statsTarget.innerHTML = renderStats(index);
  root.innerHTML = `
    <aside class="vault-sidebar">
      <input class="vault-search" type="search" placeholder="Search notes" value="${escapeAttr(state.query)}" data-vault-search>
      ${renderTagFilters(index, state)}
      ${renderIssueFilters(index, state)}
      ${renderFileList(index, state)}
    </aside>
    <article class="vault-reader">
      ${renderReader(markdown, selected, index)}
    </article>
    <aside class="vault-analysis">
      ${renderGraphCard(index, selected, state)}
      ${renderMetadataCard(selected, index)}
      ${renderBacklinksCard(index, selected)}
      ${renderOutgoingCard(index, selected)}
      ${renderDiagnosticsCard(index)}
    </aside>
  `;
  bindWorkbenchEvents(root, index, state, rerender);
  renderGraphInto(root.querySelector('[data-vault-graph-host]'), index, state);
}

function renderStats(index) {
  return [
    `<span class="vault-pill">${index.notes.size} notes</span>`,
    `<span class="vault-pill">${index.links.filter((link) => link.resolved).length} links</span>`,
    `<span class="vault-pill">${index.tags.size} tags</span>`,
    `<span class="vault-pill">${index.unresolvedLinks.length} unresolved</span>`,
    `<span class="vault-pill">${index.orphanNoteIds.size} orphan</span>`,
  ].join('');
}

function renderFileList(index, state) {
  const notes = filterNotes(index, state);
  const body = notes.length
    ? notes.map((note) => `<button class="vault-note-button${note.id === state.selectedNoteId ? ' active' : ''}" type="button" data-vault-note="${escapeAttr(note.id)}"><span class="vault-note-title">${escapeHtml(note.title)}</span><span class="vault-note-path">${escapeHtml(note.path)}</span></button>`).join('')
    : '<div class="vault-empty">No notes match the active filters.</div>';
  return `<section class="vault-section"><h2>Files</h2><div class="vault-list">${body}</div></section>`;
}

function renderTagFilters(index, state) {
  const chips = Array.from(index.tags.keys()).sort().map((tag) => `<button class="vault-chip${state.tag === tag ? ' active' : ''}" type="button" data-vault-tag="${escapeAttr(tag)}">#${escapeHtml(tag)}</button>`).join('');
  return `<section class="vault-section"><h2>Tags</h2><div class="vault-chip-row">${chips}</div></section>`;
}

function renderIssueFilters(index, state) {
  return `<section class="vault-section"><h2>Analysis</h2><div class="vault-chip-row">
    <button class="vault-chip warning${state.issue === 'unresolved' ? ' active' : ''}" type="button" data-vault-issue="unresolved">Unresolved ${index.unresolvedLinks.length}</button>
    <button class="vault-chip warning${state.issue === 'orphan' ? ' active' : ''}" type="button" data-vault-issue="orphan">Orphans ${index.orphanNoteIds.size}</button>
  </div></section>`;
}

function renderReader(markdown, note, index) {
  const badges = [
    note.frontmatter.status && `<span class="vault-pill">${escapeHtml(note.frontmatter.status)}</span>`,
    note.frontmatter.area && `<span class="vault-pill">${escapeHtml(note.frontmatter.area)}</span>`,
    ...note.tags.map((tag) => `<span class="vault-pill">#${escapeHtml(tag)}</span>`),
  ].filter(Boolean).join('');
  return `<div class="vault-document">
    <header class="vault-document-header">
      <h2>${escapeHtml(note.title)}</h2>
      <div class="vault-document-path">${escapeHtml(note.path)}</div>
      <div class="vault-badges">${badges}</div>
    </header>
    <section class="vault-markdown">${renderMarkdownForNote(markdown, note, index)}</section>
  </div>`;
}

function renderGraphCard(index, selected, state) {
  return `<section class="vault-card">
    <div class="vault-card-head">Graph</div>
    <div class="vault-card-body">
      <div class="vault-chip-row" style="margin-bottom:10px">
        <button class="vault-toggle${state.graphScope === 'local' ? ' active' : ''}" type="button" data-vault-graph-scope="local">Local</button>
        <button class="vault-toggle${state.graphScope === 'global' ? ' active' : ''}" type="button" data-vault-graph-scope="global">Global</button>
      </div>
      <div class="vault-graph-host" data-vault-graph-host data-vault-selected="${escapeAttr(selected.id)}"></div>
    </div>
  </section>`;
}

function renderMetadataCard(note) {
  const aliases = note.aliases.length ? note.aliases.map(escapeHtml).join(', ') : '<span class="vault-empty">No aliases</span>';
  const headings = note.headings.length ? note.headings.map((heading) => `<div class="vault-empty">${'#'.repeat(heading.depth)} ${escapeHtml(heading.text)}</div>`).join('') : '<div class="vault-empty">No headings</div>';
  return `<section class="vault-card"><div class="vault-card-head">Metadata</div><div class="vault-card-body">
    <div class="vault-empty">Aliases: ${aliases}</div>
    <div style="height:10px"></div>
    ${headings}
  </div></section>`;
}

function renderBacklinksCard(index, note) {
  const backlinks = index.backlinks.get(note.id) || [];
  const body = backlinks.length ? backlinks.map((link) => linkButton(index.notes.get(link.source), `from ${index.notes.get(link.source)?.title || link.source}`)).join('') : '<div class="vault-empty">No backlinks.</div>';
  return `<section class="vault-card"><div class="vault-card-head">Backlinks</div><div class="vault-card-body"><div class="vault-link-list">${body}</div></div></section>`;
}

function renderOutgoingCard(index, note) {
  const outgoing = index.links.filter((link) => link.source === note.id);
  const body = outgoing.length ? outgoing.map((link) => link.resolved ? linkButton(index.notes.get(link.target), `to ${index.notes.get(link.target)?.title || link.target}`) : `<button class="vault-link-item" type="button" disabled>missing ${escapeHtml(link.rawTarget)}</button>`).join('') : '<div class="vault-empty">No outgoing links.</div>';
  return `<section class="vault-card"><div class="vault-card-head">Outgoing</div><div class="vault-card-body"><div class="vault-link-list">${body}</div></div></section>`;
}

function renderDiagnosticsCard(index) {
  const unresolved = index.unresolvedLinks.map((link) => `<div class="vault-empty">Unresolved: ${escapeHtml(link.rawTarget)}</div>`).join('');
  const diagnostics = index.diagnostics.map((item) => `<div class="vault-empty">${escapeHtml(item.kind)} duplicate: ${escapeHtml(item.value)}</div>`).join('');
  return `<section class="vault-card"><div class="vault-card-head">Diagnostics</div><div class="vault-card-body">${unresolved || diagnostics ? unresolved + diagnostics : '<div class="vault-empty">No diagnostics.</div>'}</div></section>`;
}

function linkButton(note, label) {
  if (!note) return '';
  return `<button class="vault-link-item" type="button" data-vault-note="${escapeAttr(note.id)}">${escapeHtml(label)}</button>`;
}
```

- [ ] **Step 4: Add filters, events, and graph rendering**

Append this final runtime block:

```js
function bindWorkbenchEvents(root, index, state, rerender) {
  root.querySelector('[data-vault-search]')?.addEventListener('input', (event) => {
    state.query = event.currentTarget.value;
    rerender();
  });
  root.querySelectorAll('[data-vault-note]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedNoteId = button.dataset.vaultNote;
      state.issue = '';
      rerender();
    });
  });
  root.querySelectorAll('[data-vault-tag]').forEach((button) => {
    button.addEventListener('click', () => {
      state.tag = state.tag === button.dataset.vaultTag ? '' : button.dataset.vaultTag;
      rerender();
    });
  });
  root.querySelectorAll('[data-vault-issue]').forEach((button) => {
    button.addEventListener('click', () => {
      state.issue = state.issue === button.dataset.vaultIssue ? '' : button.dataset.vaultIssue;
      rerender();
    });
  });
  root.querySelectorAll('[data-vault-graph-scope]').forEach((button) => {
    button.addEventListener('click', () => {
      state.graphScope = button.dataset.vaultGraphScope;
      rerender();
    });
  });
  root.querySelectorAll('[data-vault-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      state.selectedNoteId = link.dataset.vaultLink;
      state.issue = '';
      rerender();
    });
  });
}

function filterNotes(index, state = {}) {
  if (state.noteIds) return Array.from(state.noteIds).map((id) => index.notes.get(id)).filter(Boolean);
  const query = String(state.query || '').trim().toLowerCase();
  return Array.from(index.notes.values()).filter((note) => {
    if (query && !`${note.title} ${note.path} ${note.body}`.toLowerCase().includes(query)) return false;
    if (state.tag && !note.tags.map((tag) => tag.toLowerCase()).includes(state.tag)) return false;
    if (state.issue === 'orphan' && !index.orphanNoteIds.has(note.id)) return false;
    if (state.issue === 'unresolved' && !index.unresolvedLinks.some((link) => link.source === note.id)) return false;
    return true;
  });
}

function renderGraphInto(host, index, state) {
  if (!host) return;
  try {
    const graph = state.graphScope === 'global' ? graphFromVaultIndex(index, state) : localGraphForNote(index, state.selectedNoteId);
    const sketch = `screen "Vault Graph" 720x300 bg #0f1117
  graph: networkDiagram at 0 0 720 300
    theme "obsidian"
    nodeRadius 16
    linkDistance 78
    charge -760
    friction 0.74
    showControls true
    showSearch true
    showFilters true
    showLegend false
    showLabels true
    showArrows true
    enableDrag true
    enableZoom true
    enablePan true
    enableHover true
    nodes ${JSON.stringify(graph.nodes)}
    links ${JSON.stringify(graph.links)}`;
    const model = parseBySyntax(sketch, 'sketch');
    host.replaceChildren();
    render(model, host);
    host.querySelectorAll('[data-network-node-id]').forEach((node) => {
      node.addEventListener('click', () => {
        const id = node.getAttribute('data-network-node-id');
        if (id && index.notes.has(id)) {
          const event = new CustomEvent('vault-graph-note-select', { bubbles: true, detail: { id } });
          host.dispatchEvent(event);
        }
      });
    });
    host.addEventListener('vault-graph-note-select', (event) => {
      const root = host.closest('.vault-shell');
      const noteButton = root?.querySelector(`[data-vault-note="${cssAttrValue(event.detail.id)}"]`);
      noteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, { once: true });
  } catch (error) {
    host.innerHTML = `<div class="vault-empty">Graph fallback: ${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
  }
}

function ensureViewerStyle() {
  if (document.getElementById('xcon-viewer-style')) return;
  const style = document.createElement('style');
  style.id = 'xcon-viewer-style';
  style.textContent = viewerCss;
  document.head.append(style);
}

function cssAttrValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
```

- [ ] **Step 5: Run syntax check and targeted test**

Run:

```powershell
node --check site/obsidian-vault-viewer-test-runtime.js
npx vitest run scripts/site-structure.test.mjs -t "obsidian vault viewer"
```

Expected: both PASS.

## Task 5: Final Verification And Commit

**Files:**
- Create: `site/obsidian-vault-viewer-test.html`
- Create: `site/obsidian-vault-viewer-test-runtime.js`
- Modify: `scripts/site-routes.mjs`
- Modify: `scripts/build-public-site.mjs`
- Modify: `scripts/site-structure.test.mjs`

- [ ] **Step 1: Run focused site tests**

Run:

```powershell
npx vitest run scripts/site-structure.test.mjs -t "obsidian vault viewer|standalone network diagram|advanced visualization test page|ESM modules|self-hosted markdown-it"
```

Expected: PASS. The output should show the selected tests passed and unrelated tests skipped.

- [ ] **Step 2: Run public site build**

Run:

```powershell
node scripts/build-public-site.mjs
```

Expected:

```text
Public site bundle written to D:\CodeTruck\CodeBox\Xamong\06 XCON\xcon-viewer\dist-site
```

- [ ] **Step 3: Run runtime syntax checks**

Run:

```powershell
node --check site/obsidian-vault-viewer-test-runtime.js
node --check site/network-diagram-test-runtime.js
```

Expected: both commands exit 0 with no syntax error output.

- [ ] **Step 4: Run the local static server and manually verify**

Run:

```powershell
$server = Start-Process -FilePath node -ArgumentList 'scripts/serve-static.mjs' -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
Write-Host "server pid $($server.Id)"
```

Open:

```text
http://127.0.0.1:4173/obsidian-vault-viewer-test.html
```

Manual checks:

- The page opens as a dark three-column workbench.
- The left file list contains `XCON Viewer`, `Network Diagram`, `Markdown Renderer`, and `Orphan Note`.
- Clicking `[[Network Diagram]]` in the Markdown reader changes the selected note.
- `[[Missing Plugin Idea]]` appears as an unresolved warning link.
- Tag chips filter the file list and graph.
- The analysis panel shows backlinks, outgoing links, diagnostics, and graph.
- Switching Local/Global graph changes the graph density.
- Clicking a graph note node selects that note.

Stop the server after checking:

```powershell
Stop-Process -Id $server.Id -Force
```

Expected: manual checks succeed.

- [ ] **Step 5: Inspect git status**

Run:

```powershell
git status --short
```

Expected: only these files are changed:

```text
 M scripts/build-public-site.mjs
 M scripts/site-routes.mjs
 M scripts/site-structure.test.mjs
?? site/obsidian-vault-viewer-test.html
?? site/obsidian-vault-viewer-test-runtime.js
```

- [ ] **Step 6: Commit**

Run:

```powershell
git add scripts/build-public-site.mjs scripts/site-routes.mjs scripts/site-structure.test.mjs site/obsidian-vault-viewer-test.html site/obsidian-vault-viewer-test-runtime.js
git commit -m "feat(site): add obsidian vault viewer test"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: the plan covers the approved static sample vault, Workbench Layout, analysis-depth scope, experimental test-page exposure, wikilinks, backlinks, tags, frontmatter, aliases, unresolved links, orphan notes, global/local graph, search, tag filters, route/build/test coverage, and no external CDN.
- Placeholder scan: no incomplete markers or deferred implementation instructions remain. The code steps include concrete filenames, route entries, HTML shell, sample data, indexer helpers, rendering functions, graph adapter functions, commands, and expected outputs.
- Type/property consistency: `vaultSamples`, `createVaultIndex`, `graphFromVaultIndex`, `localGraphForNote`, and `mountObsidianVaultViewer` are introduced before tests rely on them. Page and build paths consistently use `obsidian-vault-viewer-test`.
