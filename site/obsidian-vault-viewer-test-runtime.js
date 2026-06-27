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

export function graphFromVaultIndex(index, state = {}) {
  const visibleNotes = filterNotes(index, state);
  const visibleIds = new Set(visibleNotes.map((note) => note.id));
  const rootNodeId = state.selectedNoteId || visibleNotes[0]?.id;
  const nodes = visibleNotes.map((note) => noteToGraphNode(note, index));
  for (const node of nodes) node.isRoot = node.id === rootNodeId;
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

  return { nodes, links, groups: graphGroups(nodes), rootNodeId, subfolders: {} };
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
  disconnectVaultGraphObserver(root);
  root.innerHTML = `
    <aside class="vault-sidebar">
      <input class="vault-search" type="search" placeholder="Search notes" value="${escapeAttr(state.query)}" data-vault-search>
      ${renderTagFilters(index, state)}
      ${renderIssueFilters(index, state)}
      ${renderFileList(index, state)}
    </aside>
    <div class="vault-splitter vault-splitter-left" role="separator" aria-orientation="vertical" aria-label="Resize file sidebar" tabindex="0" data-vault-splitter="left"></div>
    <article class="vault-reader">
      <section class="vault-document-pane" data-vault-document-pane>
        ${renderReader(markdown, selected, index)}
      </section>
      <div class="vault-splitter vault-splitter-graph" role="separator" aria-orientation="horizontal" aria-label="Resize graph panel" tabindex="0" data-vault-splitter="graph"></div>
      ${renderGraphCard(index, selected, state)}
    </article>
    <div class="vault-splitter vault-splitter-right" role="separator" aria-orientation="vertical" aria-label="Resize analysis sidebar" tabindex="0" data-vault-splitter="right"></div>
    <aside class="vault-analysis">
      ${renderMetadataCard(selected)}
      ${renderBacklinksCard(index, selected)}
      ${renderOutgoingCard(index, selected)}
      ${renderDiagnosticsCard(index)}
    </aside>
  `;
  bindWorkbenchEvents(root, index, state, rerender);
  bindVaultSplitters(root);
  renderGraphInto(root.querySelector('[data-vault-graph-host]'), index, state, rerender);
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
  return `<section class="vault-card vault-reader-graph" data-vault-reader-graph>
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

function bindVaultSplitters(root) {
  root.querySelectorAll('[data-vault-splitter]').forEach((splitter) => {
    splitter.addEventListener('pointerdown', (event) => startVaultResize(root, splitter, event));
    splitter.addEventListener('dblclick', () => resetVaultSplitter(root, splitter.dataset.vaultSplitter));
    splitter.addEventListener('keydown', (event) => nudgeVaultSplitter(root, splitter.dataset.vaultSplitter, event));
  });
}

function startVaultResize(root, splitter, event) {
  const side = splitter.dataset.vaultSplitter;
  if (side !== 'left' && side !== 'right' && side !== 'graph') return;
  event.preventDefault();
  splitter.setPointerCapture(event.pointerId);
  root.ownerDocument.body.classList.add(side === 'graph' ? 'vault-resizing-y' : 'vault-resizing-x');

  const resize = (moveEvent) => {
    if (side === 'graph') {
      applyVaultGraphHeight(root, heightFromPointer(root, moveEvent.clientY));
      return;
    }
    applyVaultPanelWidth(root, side, widthFromPointer(root, side, moveEvent.clientX));
  };
  const stop = (stopEvent) => {
    if (splitter.hasPointerCapture(stopEvent.pointerId)) splitter.releasePointerCapture(stopEvent.pointerId);
    root.ownerDocument.body.classList.remove('vault-resizing', 'vault-resizing-x', 'vault-resizing-y');
    splitter.removeEventListener('pointermove', resize);
    splitter.removeEventListener('pointerup', stop);
    splitter.removeEventListener('pointercancel', stop);
  };

  resize(event);
  splitter.addEventListener('pointermove', resize);
  splitter.addEventListener('pointerup', stop);
  splitter.addEventListener('pointercancel', stop);
}

function widthFromPointer(root, side, clientX) {
  const rect = root.getBoundingClientRect();
  const currentLeft = readVaultPanelWidth(root, 'left');
  const currentRight = readVaultPanelWidth(root, 'right');
  const splitterTotal = 16;
  const readerMin = 420;
  if (side === 'left') {
    const max = Math.min(420, rect.width - currentRight - splitterTotal - readerMin);
    return clamp(clientX - rect.left, 220, max);
  }
  const max = Math.min(560, rect.width - currentLeft - splitterTotal - readerMin);
  return clamp(rect.right - clientX, 300, max);
}

function heightFromPointer(root, clientY) {
  const reader = root.querySelector('.vault-reader');
  const rect = (reader || root).getBoundingClientRect();
  const documentMin = 260;
  const splitterHeight = 8;
  const max = Math.min(760, rect.height - documentMin - splitterHeight);
  return clamp(rect.bottom - clientY, 260, max);
}

function nudgeVaultSplitter(root, side, event) {
  const keys = side === 'graph' ? ['ArrowUp', 'ArrowDown', 'Home', 'End'] : ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  if (side === 'graph') {
    if (event.key === 'Home') return applyVaultGraphHeight(root, defaultVaultGraphHeight());
    if (event.key === 'End') return applyVaultGraphHeight(root, 760);
    const delta = event.key === 'ArrowUp' ? 24 : -24;
    applyVaultGraphHeight(root, readVaultGraphHeight(root) + delta);
    return;
  }
  if (event.key === 'Home') return applyVaultPanelWidth(root, side, defaultVaultPanelWidth(side));
  if (event.key === 'End') return applyVaultPanelWidth(root, side, side === 'left' ? 420 : 560);
  const direction = event.key === 'ArrowLeft' ? -1 : 1;
  const delta = side === 'right' ? -direction * 16 : direction * 16;
  applyVaultPanelWidth(root, side, readVaultPanelWidth(root, side) + delta);
}

function resetVaultSplitter(root, side) {
  if (side === 'graph') {
    applyVaultGraphHeight(root, defaultVaultGraphHeight());
    return;
  }
  applyVaultPanelWidth(root, side, defaultVaultPanelWidth(side));
}

function applyVaultPanelWidth(root, side, width) {
  if (side === 'left') {
    root.style.setProperty('--vault-sidebar-width', `${clamp(width, 220, 420)}px`);
    return;
  }
  if (side === 'right') {
    root.style.setProperty('--vault-analysis-width', `${clamp(width, 300, 560)}px`);
  }
}

function applyVaultGraphHeight(root, height) {
  root.style.setProperty('--vault-graph-height', `${clamp(height, 260, 760)}px`);
}

function readVaultPanelWidth(root, side) {
  const property = side === 'left' ? '--vault-sidebar-width' : '--vault-analysis-width';
  const fallback = defaultVaultPanelWidth(side);
  return Number.parseFloat(getComputedStyle(root).getPropertyValue(property)) || fallback;
}

function readVaultGraphHeight(root) {
  return Number.parseFloat(getComputedStyle(root).getPropertyValue('--vault-graph-height')) || defaultVaultGraphHeight();
}

function defaultVaultPanelWidth(side) {
  return side === 'left' ? 300 : 390;
}

function defaultVaultGraphHeight() {
  return 420;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, Math.max(min, max)));
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

function renderGraphInto(host, index, state, rerender) {
  if (!host) return;
  renderGraphWithHostSize(host, index, state, rerender, true);
  bindGraphResizeObserver(host, index, state, rerender);
}

function renderGraphWithHostSize(host, index, state, rerender, force = false) {
  const { width, height } = graphHostSize(host);
  const sizeKey = `${width}x${height}`;
  if (!force && host.dataset.vaultGraphSizeKey === sizeKey) return;
  host.dataset.vaultGraphSizeKey = sizeKey;
  try {
    const graph = state.graphScope === 'global' ? graphFromVaultIndex(index, state) : localGraphForNote(index, state.selectedNoteId);
    const sketch = `screen "Vault Graph" ${width}x${height} bg #0f1117
  graph: networkDiagram at 0 0 ${width} ${height}
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
        if (!id || !index.notes.has(id)) return;
        state.selectedNoteId = id;
        state.issue = '';
        rerender();
      });
    });
  } catch (error) {
    host.innerHTML = `<div class="vault-empty">Graph fallback: ${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
  }
}

function graphHostSize(host) {
  const rect = host.getBoundingClientRect();
  const width = Math.round(rect.width || host.clientWidth || 720);
  const height = Math.round(rect.height || host.clientHeight || 420);
  return {
    width: clamp(width, 320, 2400),
    height: clamp(height, 220, 1600),
  };
}

function bindGraphResizeObserver(host, index, state, rerender) {
  const root = host.closest('.vault-shell');
  if (!root || typeof ResizeObserver !== 'function') return;
  let frame = 0;
  const observer = new ResizeObserver(() => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!host.isConnected) return;
      renderGraphWithHostSize(host, index, state, rerender);
    });
  });
  observer.observe(host);
  root.__vaultGraphResizeObserver = observer;
}

function disconnectVaultGraphObserver(root) {
  root.__vaultGraphResizeObserver?.disconnect();
  root.__vaultGraphResizeObserver = undefined;
}

function ensureViewerStyle() {
  if (document.getElementById('xcon-viewer-style')) return;
  const style = document.createElement('style');
  style.id = 'xcon-viewer-style';
  style.textContent = viewerCss;
  document.head.append(style);
}
