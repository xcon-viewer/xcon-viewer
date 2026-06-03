# Remote Terminals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SSH and TELNET terminal sessions to XconViewer Desk while preserving the existing xterm-based multi-tab terminal experience.

**Architecture:** Keep `TerminalPane` and `terminalHost` as the single terminal UI. Extend the main-process terminal session registry from PTY-only records to a backend abstraction with `shell`, `ssh`, and `telnet` implementations. Store saved remote server profiles in `AppSettings`, including local plaintext passwords when the user opts to save them.

**Tech Stack:** Electron, React, TypeScript, xterm.js, `@lydell/node-pty`, `ssh2`, Node `net.Socket`, node:test static/behavior tests.

---

### Task 1: Define Remote Terminal Contracts

**Files:**
- Modify: `tools/xcon-viewer-desk/src/shared/types.ts`
- Test: `tools/xcon-viewer-desk/scripts/remoteTerminalTypes.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node:test file that reads `src/shared/types.ts` and verifies these exported contracts exist: `RemoteTerminalProtocol`, `RemoteTerminalProfile`, `TerminalSessionKind`, `TerminalSpawnRequest` discriminates `kind: 'shell' | 'ssh' | 'telnet'`, `TerminalSpawnResult` exposes `kind`, and `AppSettings` contains `remoteTerminals`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/remoteTerminalTypes.test.mjs`

Expected: FAIL because the contracts are missing.

- [ ] **Step 3: Write minimal implementation**

Add the shared types with saved profile fields: `id`, `name`, `protocol`, `host`, `port`, `username`, `password`, `privateKeyPath`, `passphrase`, `connectTimeoutMs`, `initialCommand`, `createdAt`, `updatedAt`. Replace the shell-only spawn request/result with a discriminated union while keeping shell support backward compatible via `kind?: 'shell'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/remoteTerminalTypes.test.mjs`

Expected: PASS.

### Task 2: Add Main-Process Session Backends

**Files:**
- Modify: `tools/xcon-viewer-desk/package.json`
- Modify: `package-lock.json`
- Modify: `tools/xcon-viewer-desk/src/main/index.ts`
- Test: `tools/xcon-viewer-desk/scripts/remoteTerminalBackend.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node:test file that verifies `src/main/index.ts` imports `ssh2` and `node:net`, defines backend helper names for `createShellBackend`, `createSshBackend`, `createTelnetBackend`, routes `terminal:write`, `terminal:resize`, and `terminal:kill` through backend methods, and no longer stores `ptyProcess` as the only session process field.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/remoteTerminalBackend.test.mjs`

Expected: FAIL because the backend abstraction is missing.

- [ ] **Step 3: Install dependency**

Run: `npm install ssh2 @types/ssh2`

Expected: `tools/xcon-viewer-desk/package.json`, `tools/xcon-viewer-desk/package-lock.json`, and top-level npm metadata are updated as npm requires.

- [ ] **Step 4: Implement minimal backends**

Create a `TerminalBackend` interface inside `src/main/index.ts`. Keep local shell behavior on `@lydell/node-pty`. Implement SSH with `ssh2.Client.shell({ term: 'xterm-256color', cols, rows })` and `stream.setWindow(rows, cols, 0, 0)` when available. Implement TELNET with `net.createConnection`, minimal IAC option responses, and raw data forwarding.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/remoteTerminalBackend.test.mjs`

Expected: PASS.

### Task 3: Persist Remote Profiles In Settings

**Files:**
- Modify: `tools/xcon-viewer-desk/src/main/index.ts`
- Modify: `tools/xcon-viewer-desk/src/renderer/panes/settingsCatalog.mjs`
- Modify: `tools/xcon-viewer-desk/src/renderer/panes/settingsCatalog.d.ts`
- Modify: `tools/xcon-viewer-desk/src/renderer/panes/settingsCatalog.d.mts`
- Modify: `tools/xcon-viewer-desk/src/renderer/panes/SettingsPane.tsx`
- Modify: `tools/xcon-viewer-desk/src/renderer/i18n/ko.ts`
- Modify: `tools/xcon-viewer-desk/src/renderer/i18n/en.ts`
- Test: `tools/xcon-viewer-desk/scripts/remoteTerminalSettings.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node:test file verifying that settings catalog includes a `remote-terminals` category, both locale files include required remote terminal keys, `SettingsPane.tsx` renders add/save/delete/connect profile controls, and `handleSave` persists `remoteTerminals`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/remoteTerminalSettings.test.mjs`

Expected: FAIL because the settings UI does not exist.

- [ ] **Step 3: Implement settings persistence and UI**

Add `remoteTerminals: { profiles: [] }` to default settings and merge logic. Add a settings category with a profile list and editor fields for protocol, name, host, port, username, password, key path, passphrase, timeout, initial command. Store passwords as plain text in settings, matching user request.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/remoteTerminalSettings.test.mjs`

Expected: PASS.

### Task 4: Open Remote Sessions From Terminal Dropdown

**Files:**
- Modify: `tools/xcon-viewer-desk/src/renderer/App.tsx`
- Modify: `tools/xcon-viewer-desk/src/renderer/terminal/terminalHost.ts`
- Modify: `tools/xcon-viewer-desk/src/renderer/i18n/ko.ts`
- Modify: `tools/xcon-viewer-desk/src/renderer/i18n/en.ts`
- Test: `tools/xcon-viewer-desk/scripts/remoteTerminalDropdown.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node:test file verifying App has `createRemoteTerminalSession`, reads `settings.remoteTerminals.profiles`, renders saved remote profiles in the shell dropdown, and terminalHost spawn accepts a remote request instead of `ShellKind` only.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/remoteTerminalDropdown.test.mjs`

Expected: FAIL because the dropdown is local-shell-only.

- [ ] **Step 3: Implement remote session launch**

Generalize terminalHost spawn to accept a spawn request. Add App state for saved profiles, refresh it from settings, add remote profile menu items, generate titles like `SSH: prod` and `TELNET: switch`, and keep local shell behavior unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/remoteTerminalDropdown.test.mjs`

Expected: PASS.

### Task 5: Verification

**Files:**
- No planned production changes.

- [ ] **Step 1: Run focused tests**

Run: `node --test scripts/remoteTerminalTypes.test.mjs scripts/remoteTerminalBackend.test.mjs scripts/remoteTerminalSettings.test.mjs scripts/remoteTerminalDropdown.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run existing affected tests**

Run: `node --test scripts/settingsCatalog.test.mjs scripts/i18nRegistry.test.mjs scripts/tuiScrollPolicy.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.
