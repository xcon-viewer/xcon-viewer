# The XCON Open-Source Stack

> Three repositories. One layered architecture. A shared goal: making AI-generated
> visual documents practical, safe, and reusable.

This document explains how **Pomelo Suite**, **XCON Viewer**, and **XV Desk** relate
to each other, why they are separate projects, and where to start depending on
what you want to build.

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│  XV Desk  (Electron developer workbench — desktop product)   │
│  Multi-terminal · Dockable UI · File manager · MCP bridge    │
│  github.com/xcon-viewer/xcon-viewer · tools/xcon-viewer-desk │
└────────────────────┬─────────────────────────────────────────┘
                     │  uses
┌────────────────────▼─────────────────────────────────────────┐
│  XCON Viewer  (document format + rendering engine)           │
│  @xcon-viewer/core · viewer · cli · react · vue              │
│  markdown-it · remark · vite-plugin · github-action          │
│  github.com/xcon-viewer/xcon-viewer                          │
└────────────────────┬─────────────────────────────────────────┘
                     │  uses internally
┌────────────────────▼─────────────────────────────────────────┐
│  Pomelo Suite  (Canvas UI primitives + runtime utilities)    │
│  @pomelo-suite/spangrid · diagram · scheduler · workqueue    │
│  calculator · runtime · color-picker · input · timeline      │
│  github.com/xcon-viewer/pomelo-suite                         │
└──────────────────────────────────────────────────────────────┘
```

Each layer is an independently usable open-source project with its own npm
packages and release cycle. The arrows show internal dependency, not forced
installation — you can use any layer without knowing the layers above it.

---

## Layer 1 — Pomelo Suite

**What it is:** A collection of standalone browser and Node.js packages that
solve narrow, reusable problems: a Canvas data grid, an expression evaluator,
a work queue, a scheduler, a diagram renderer, and a handful of input controls.

**Who it is for:** Developers who need a capable Canvas grid (`@pomelo-suite/spangrid`),
a client-side scheduler, or a lightweight work queue — independently of XCON.

**Key packages:**

| Package | Stability | What it does |
|---------|-----------|-------------|
| `@pomelo-suite/spangrid` | stable | Canvas data grid with cell-span support and TSV copy/paste |
| `@pomelo-suite/diagram` | experimental | Data-first diagram renderer |
| `@pomelo-suite/scheduler` | stable | ONETIME / INTERVAL / DAILY scheduler |
| `@pomelo-suite/workqueue` | stable | Bounded work queue with worker-thread pool |
| `@pomelo-suite/runtime` | experimental | Agent workflow runner built on the above |
| `@pomelo-suite/calculator` | stable | Expression evaluator |
| `@pomelo-suite/input` | stable | Canvas text / number input |
| `@pomelo-suite/color-picker` | stable | Canvas HSV color picker |
| `@pomelo-suite/timeline` | stable | Canvas timeline editor |

**Connection to XCON Viewer:** The XCON Viewer uses SpanGrid, diagram, and input
controls internally for rendering XCON documents. Pomelo Suite does not depend
on XCON Viewer in the other direction.

**Figma bridge:** The `grideditor` Figma plugin converts SpanGrid table designs
directly to XCON node format, making Pomelo Suite a design-to-XCON entry point.

```
npm install @pomelo-suite/spangrid
```

---

## Layer 2 — XCON Viewer

**What it is:** A document format (XCON) and a safe rendering engine for that
format. XCON documents contain charts, grids, maps, banners, and other visual
components — described in structured syntax, never as executable scripts.

**Who it is for:** Anyone who wants LLMs to generate rich visual documents, share
UI safely across trust boundaries, or embed visual blocks inside Markdown.

**Why the format exists:**

| Problem | XCON answer |
|---------|------------|
| HTML + JS is unsafe to share from untrusted sources | XCON viewer blocks all script execution by design |
| LLMs generate inconsistent HTML/CSS | SKETCH syntax aligns with YAML/Markdown patterns LLMs already know |
| Design systems change faster than document templates | XCON Chain separates layout from data — update data, keep the document |
| One team uses React, another uses Vue | `@xcon-viewer/react`, `@xcon-viewer/vue`, `@xcon-viewer/markdown-it`, `@xcon-viewer/remark` |

**The four syntaxes:**

| Syntax | Best for |
|--------|---------|
| SKETCH | LLM generation, human authoring — indentation-based, readable |
| JSON | API exchange, programmatic generation |
| XML | Legacy system compatibility |
| TAGLESS | Minimal syntax for embedded contexts |

All four syntaxes share one object model. Parse any syntax, render with the
same viewer, convert between syntaxes with the CLI.

**The data-refresh paradigm (XCON Chain):** An LLM generates the document layout
once as a template. On subsequent runs, only the fixture data changes — the
document structure stays intact. This makes daily reports, live dashboards, and
recurring briefings practical without re-generating the full layout each time.

```bash
npm install @xcon-viewer/core @xcon-viewer/viewer
# or for Markdown integration:
npm install @xcon-viewer/markdown-it
# or CLI:
npm install -g @xcon-viewer/cli
```

**Live playground:** https://xconviewer.dev/play

---

## Layer 3 — XV Desk

**What it is:** An Electron desktop developer workbench that ties the stack
together into a product. It is the recommended way to experience XCON without
setting up a project.

**Who it is for:** Developers who work with AI agents and CLI tools and want
a unified workspace — multi-terminal, file management, AI agent output, and
XCON document preview — without stitching tools together manually.

**Key capabilities:**

| Capability | Details |
|-----------|---------|
| Multi-terminal | Real PTY terminals — local shells (pwsh, CMD, WSL), SSH, TELNET |
| File management | Local and remote (FTP/SFTP) file explorer with favorites |
| Dockable workspace | Panels can be arranged, detached, and restored across sessions |
| XCON + Markdown rendering | Live preview of `.xcon.md`, `.sketch`, and Markdown files |
| MCP bridge | External AI agents control XV Desk via the Model Context Protocol |
| Bot panel + Artifact Library | Review, compare, and replay AI-generated artifacts |
| Extension system | Drop-in JavaScript extension modules |

**AI agent loop:**

```
Agent (Claude / Codex / Hermes / your own)
  ↓  MCP call: render_document, open_file, run_command
XV Desk executes in the real workspace
  ↓  result back to agent
Agent refines output
```

XV Desk does not replace your existing terminal or editor. It is an **observation
and orchestration layer** — you see agent output rendered live, compare
iterations, and approve file changes before they land.

---

## Connection Points Between Layers

| Connection | What it means in practice |
|-----------|--------------------------|
| SpanGrid → XCON Viewer | XCON's `spanGrid` component renders using `@pomelo-suite/spangrid` internally |
| Diagram → XCON Viewer | XCON's `networkDiagram` component renders using `@pomelo-suite/diagram` |
| Figma plugin → XCON | `grideditor` exports SpanGrid table → XCON Chain fixture |
| XCON Chain → XV Desk | Template Studio in XV Desk edits fixtures and binds them to documents |
| MCP → XCON | AI agents call `render_document` over MCP; XV Desk renders the result live |
| xcon-workflow → XV Desk | Workflow scripts execute inside XV Desk with live progress dashboards |

---

## Where to Start

**"I just want to see XCON render something."**
→ https://xconviewer.dev/play — no install needed.

**"I want LLMs to generate XCON for my app."**
→ Start with `@xcon-viewer/core` and the prompt set in `prompts/`.

**"I use React / Vue / Vite / remark."**
→ Install the matching adapter package. See `packages/` for docs.

**"I want to embed XCON in Markdown files."**
→ `@xcon-viewer/markdown-it` or `@xcon-viewer/remark`.

**"I want a Canvas grid that works without XCON."**
→ `@pomelo-suite/spangrid` — no XCON dependency.

**"I work with AI agents and want a workbench to see their output."**
→ Download XV Desk. It ships with the MCP server and demo lab ready.

**"I want to automate a recurring document (daily report, live dashboard)."**
→ Read the XCON Chain + Template Studio docs and prompt 12 in `mcp/prompts/new/`.

---

## Why Three Repositories?

**Separation of concerns, not fragmentation.**

| If they were merged | Problem |
|--------------------|---------|
| Pomelo Suite + XCON Viewer | A SpanGrid bug requires a full XCON Viewer release |
| XCON Viewer + XV Desk | An Electron packaging change breaks npm library users |
| All three together | One monorepo covers browser Canvas, server CLI, and desktop Electron — no coherent audience |

Each repository has its own audience, its own release cadence, and its own
stability contract. Pomelo Suite can reach 1.0 before XCON Viewer does. XV Desk
can ship Windows releases without touching npm. XCON Viewer can publish CLI
fixes without requiring a desktop build.

The shared goal is that a developer who discovers any layer can find and adopt
the others when they are ready for them.

---

## Repository Links

| Project | GitHub | npm |
|---------|--------|-----|
| Pomelo Suite | github.com/xcon-viewer/pomelo-suite | `@pomelo-suite/*` |
| XCON Viewer | github.com/xcon-viewer/xcon-viewer | `@xcon-viewer/*` |
| XV Desk | github.com/xcon-viewer/xcon-viewer (tools/xcon-viewer-desk) | desktop release |

**Website:** https://xconviewer.dev
