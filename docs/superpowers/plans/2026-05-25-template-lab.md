# Template Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an experimental public page that demonstrates Markdown templates rendered with JSON data, XCON Chain SUGAR bindings, XCON/SKETCH UI blocks, and XCON Workflow blocks.

**Architecture:** Create a standalone `site/template-lab.html` page that imports the deployed public packages from `/packages`, `/xcon-chain`, and `/xcon-workflow`. The visible authoring syntax must be SKETCH + SUGAR: UI blocks use XCON/SKETCH, data expressions use pipe-style SUGAR, and workflow blocks use the workflow sketch syntax. Link it from the existing Companion Tools card grid beside XCON Chain and XCON Workflow.

**Tech Stack:** Static HTML, public ESM packages, XCON/SKETCH renderer, XCON Chain sugar template rendering, XCON Workflow HTML rendering.

---

### Task 1: Add Template Lab Page

**Files:**
- Create: `site/template-lab.html`

- [ ] Create a static lab page with two editable inputs: Markdown template and JSON data.
- [ ] Render visible data expressions with pipe-style SUGAR fences such as ` ```xcon-chain ` and `= record.items | map title | join ", "`.
- [ ] Keep any internal `{{...}}` interpolation private to the renderer and do not present it as the recommended visible syntax.
- [ ] Render `xcon-sketch` and `sketch` fences through `parseBySyntax` and `render`; do not promote JSON/XML/TAGLESS on the lab page.
- [ ] Render `xcon-workflow` and `workflow` fences through `parseWorkflow`, `validateWorkflow`, and `renderWorkflowHtml`.
- [ ] Show readable errors inside the preview instead of throwing uncaught exceptions.
- [ ] Use examples that teach SKETCH + SUGAR together: weekly report cards, invoice rows, church bulletin service order, or workflow summary.

### Task 2: Link Lab From Public Site

**Files:**
- Modify: `site/index.html`
- Modify: `site/docs.html`
- Modify: `site/sitemap.xml`
- Modify: `site/llms.txt`
- Modify: `site/llms-full.txt`

- [ ] Add a third “Template Lab” / “Experimental Lab” card beside XCON Chain and XCON Workflow.
- [ ] Add documentation links so the page is discoverable from Docs and machine-readable indexes.

### Task 3: Verify

**Files:**
- Test: `scripts/site-structure.test.mjs`

- [ ] Add site structure assertions for `/template-lab`.
- [ ] Run `npm run test:site`.
