# XCON Template Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Figma plugin that renders Markdown-based XCON templates with fixture data and inserts resolved SKETCH blocks as native Figma nodes.

**Architecture:** The UI evaluates templates and renders previews with bundled public browser runtimes. The Figma main thread receives plain resolved XCON JSON trees and delegates node creation to the existing public SKETCH renderer. The new plugin lives in `figma-plugins/xcon-template-studio` and does not modify the existing two public plugins.

**Tech Stack:** Figma Plugin API, browser HTML/CSS/JavaScript, esbuild, Node `node:test`, `@xcon-viewer/core`, `@xcon-viewer/viewer`, `@xcon-chain/core`.

---

### Task 1: Scaffold And Template Engine

**Files:**
- Create: `figma-plugins/xcon-template-studio/package.json`
- Create: `figma-plugins/xcon-template-studio/manifest.json`
- Create: `figma-plugins/xcon-template-studio/README.md`
- Create: `figma-plugins/xcon-template-studio/src/template-engine.js`
- Create: `figma-plugins/xcon-template-studio/test/template-engine.test.cjs`

- [ ] **Step 1: Write the failing template engine tests**

Add tests that load `src/template-engine.js` in a VM context with fake `chain`, `core`, and `viewer` modules. Verify alias resolution, multiple SKETCH fences, and diagnostics.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test figma-plugins/xcon-template-studio/test/template-engine.test.cjs`

Expected: FAIL because `src/template-engine.js` does not exist.

- [ ] **Step 3: Write minimal template engine implementation**

Implement `createTemplateStudioEngine(modules)` with `renderTemplateDocument(templateText, fixtureData)`, fence parsing, chain alias storage, variable replacement, SKETCH parsing, and diagnostics.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test figma-plugins/xcon-template-studio/test/template-engine.test.cjs`

Expected: PASS.

### Task 2: Plugin UI

**Files:**
- Create: `figma-plugins/xcon-template-studio/src/public-runtime-entry.js`
- Create: `figma-plugins/xcon-template-studio/src/ui-template.html`
- Create: `figma-plugins/xcon-template-studio/test/source-wiring.test.cjs`

- [ ] **Step 1: Write failing source wiring tests**

Verify that the UI references `XconTemplateStudioEngine`, renders source/output tabs, sends `insert-template-block` and `insert-template-blocks`, and avoids beta Xamong globals.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test figma-plugins/xcon-template-studio/test/source-wiring.test.cjs`

Expected: FAIL because UI files do not exist.

- [ ] **Step 3: Write minimal UI and runtime entry**

Create a static Figma UI with template and fixture editors, render/insert actions, preview/inspect/source tabs, and browser runtime globals.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test figma-plugins/xcon-template-studio/test/source-wiring.test.cjs`

Expected: PASS.

### Task 3: Main Thread And Build

**Files:**
- Create: `figma-plugins/xcon-template-studio/src/code-entry.js`
- Create: `figma-plugins/xcon-template-studio/scripts/build-plugin.cjs`
- Generate: `figma-plugins/xcon-template-studio/ui.html`
- Generate: `figma-plugins/xcon-template-studio/code.js`

- [ ] **Step 1: Extend failing source wiring tests**

Verify that the main entry handles single and batch insert message types and that the build script resolves public workspace packages plus `@xcon-chain/core`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test figma-plugins/xcon-template-studio/test/source-wiring.test.cjs`

Expected: FAIL because main/build files do not exist.

- [ ] **Step 3: Write minimal main entry and build script**

Create Figma message handlers and an esbuild script that inlines public runtime plus the template engine into `ui.html`, and concatenates the existing public renderer files into `code.js`.

- [ ] **Step 4: Run source tests**

Run: `node --test figma-plugins/xcon-template-studio/test/*.test.cjs`

Expected: PASS.

- [ ] **Step 5: Build plugin**

Run: `npm run build --prefix figma-plugins/xcon-template-studio`

Expected: creates `ui.html` and `code.js`.

- [ ] **Step 6: Syntax-check generated main code**

Run: `node --check figma-plugins/xcon-template-studio/code.js`

Expected: PASS.
