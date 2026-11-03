# Embedded Graph, LiveView Mode, GitHub Auto-Updater, Logo & Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Hoshinote with a user-authored Markdown graph block engine, single-pane LiveView editing mode, GitHub auto-updater module, new Hoshino app branding/logo, and comprehensive English documentation suite while retiring the standalone graph tab view.

**Architecture:** Codeblocks with language `graph` or `mermaid` are compiled in `src/lib/markdown.ts` and rendered in-place as interactive canvas widgets. A 4th view mode `liveview` provides a single-surface Word-like editing experience with real-time typography, MathJax, and graph blocks. An updater module queries GitHub Releases API with `@tauri-apps/plugin-shell` launch, and Tauri icons are regenerated using the provided mascot logo.

**Tech Stack:** React 19, TypeScript, CodeMirror 6, MathJax 3 (vector SVG), Canvas 2D Force Simulation, Tauri 2.0, SQLite FTS5 (rusqlite), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-markdown-graph-liveview-updater-design.md`

## Global Constraints

- Retain 100% pass rate on all 78 E2E test cases (`node tests/e2e/runner.js`).
- Retain 100% pass rate on all 40 Rust tests in `src-tauri` (`cargo test`).
- TypeScript strict checking must pass with 0 errors (`pnpm exec tsc --noEmit`).
- Keep production build cleanly bundleable (`pnpm run build`).
- Do not introduce breaking changes to database schemas or existing note storage.

## Review Focus

1. Embedded graph DSL syntax with special characters or empty blocks must render gracefully without throwing uncaught exceptions.
2. LiveView typing with continuous rapid keystrokes must preserve cursor position and 350ms autosave debounce.
3. Offline GitHub updater checks must fail silently with user-friendly "Unable to check for updates (offline)" notification without crashing.
4. Embedded graph canvas resize when toggling sidebar/inspector must adapt dynamically via ResizeObserver.
5. Cyclic or self-referential graph syntax (`A -> B -> A`, `A -> A`) in markdown graph blocks must simulate safely without infinite physics divergence.

---

### Task 1: App Branding & Logo Update

**Files:**
- Create/Overwrite: `public/logo.png`, `public/favicon.ico`, `public/favicon.svg`
- Modify: `index.html`
- Modify: `src/components/layout/AppHeader.tsx`
- Generate: `src-tauri/icons/*` via `pnpm tauri icon`

**Interfaces:**
- Consumes: Source image at `C:\Users\nomoka\Downloads\logo.jpg`
- Produces: Tauri app icons, browser favicon, and `AppHeader` brand avatar

- [ ] **Step 1: Copy logo asset to public directory**
  Copy `C:\Users\nomoka\Downloads\logo.jpg` to `public/logo.png` and `public/logo.jpg`.

- [ ] **Step 2: Generate Tauri multi-platform desktop icons**
  Run `pnpm tauri icon "C:\Users\nomoka\Downloads\logo.jpg" --fit cover` to regenerate `src-tauri/icons/32x32.png`, `128x128.png`, `icon.ico`, `icon.icns`, etc.

- [ ] **Step 3: Update `index.html` and `AppHeader.tsx`**
  In `index.html`, set favicon link to `/logo.png`.
  In `src/components/layout/AppHeader.tsx`, replace the placeholder Sparkles box with an `<img>` tag pointing to `/logo.png` styled with `w-6 h-6 rounded-md object-cover shadow-xs border border-white/10`.

- [ ] **Step 4: Verify build and icon presence**
  Run `pnpm exec tsc --noEmit` and check that `/logo.png` is bundled.

- [ ] **Step 5: Commit branding changes**
  ```bash
  git add public/ src-tauri/icons/ index.html src/components/layout/AppHeader.tsx
  git commit -m "feat(branding): update app logo and desktop icons with Hoshino mascot"
  ```

---

### Task 2: User-Defined Markdown Graph DSL & Parser

**Files:**
- Create: `src/lib/graphParser.ts`
- Create: `src/test/graphParser.test.ts`
- Modify: `src/lib/markdown.ts`

**Interfaces:**
- Produces: `parseGraphDsl(dsl: string): { nodes: EmbeddedNode[], links: EmbeddedLink[] }`
- Modifies: `renderMarkdown(content)` to compile ```` ```graph ```` and ```` ```mermaid ```` into `<div class="embedded-graph-block">`

- [ ] **Step 1: Write unit tests for `parseGraphDsl` in `src/test/graphParser.test.ts`**
  Test edge cases:
  - Directed edges: `A -> B`
  - Edges with labels: `Frontend -> Backend: IPC`
  - Bracketed titles: `[Tauri App] -> [SQLite DB]: rusqlite`
  - Isolated nodes: `Standalone Node`
  - Edge cases: Empty lines, comments starting with `#` or `//`, cyclic references `A -> B -> A`.

- [ ] **Step 2: Run test to verify it fails**
  Run `pnpm test src/test/graphParser.test.ts`
  Expected: FAIL (module not found).

- [ ] **Step 3: Implement `parseGraphDsl` in `src/lib/graphParser.ts`**
  Implement parsing algorithm returning typed nodes and links with automatic color assignment and degree calculation.

- [ ] **Step 4: Update `src/lib/markdown.ts` to shield and render ```` ```graph ```` and ```` ```mermaid ```` blocks**
  When fenced codeblock language is `graph`:
  Produce `<div class="embedded-graph-container" data-graph-source="...">...</div>`.
  When fenced codeblock language is `mermaid`:
  Produce `<div class="embedded-mermaid-container" data-mermaid-source="...">...</div>`.

- [ ] **Step 5: Run unit tests to verify they pass**
  Run `pnpm test src/test/graphParser.test.ts`
  Expected: PASS.

- [ ] **Step 6: Commit graph parser**
  ```bash
  git add src/lib/graphParser.ts src/lib/markdown.ts src/test/graphParser.test.ts
  git commit -m "feat(markdown): implement user-authored graph DSL parser and block shield"
  ```

---

### Task 3: Embedded Interactive Graph Widget & Layout Simplification

**Files:**
- Create: `src/components/graph/EmbeddedGraphBlock.tsx`
- Modify: `src/components/preview/MarkdownPreview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppHeader.tsx`

**Interfaces:**
- Consumes: `parseGraphDsl` from `src/lib/graphParser.ts`
- Modifies: `MarkdownPreview.tsx` to mount embedded graph canvas blocks inside preview DOM.
- Modifies: `App.tsx` and `AppHeader.tsx` to remove standalone Graph tab view and bottom Dock.

- [ ] **Step 1: Implement `EmbeddedGraphBlock.tsx`**
  Interactive 2D canvas force-simulation widget:
  - Uses HTML5 Canvas + D3 force physics simulation.
  - Supports zoom, pan, dragging nodes with degree-based sizing and Catppuccin theme styling.
  - Header bar with node/edge counter and camera reset button.

- [ ] **Step 2: Hydrate embedded graph blocks in `MarkdownPreview.tsx`**
  After HTML update, mount `EmbeddedGraphBlock` into `<div class="embedded-graph-container">` elements.

- [ ] **Step 3: Remove standalone Graph tab view and Dock from `App.tsx` & `AppHeader.tsx`**
  - In `App.tsx`: Remove `currentView === 'graph'` mode and dock drawer. Always stay in editor/workspace view.
  - In `AppHeader.tsx`: Remove graph toggle button.
  - Remove unused imports while keeping backend IPC tests intact.

- [ ] **Step 4: Run tests and TypeScript typecheck**
  Run `pnpm exec tsc --noEmit` and `pnpm test`.
  Expected: All 89+ tests PASS.

- [ ] **Step 5: Commit embedded graph block and layout cleanup**
  ```bash
  git add src/components/graph/EmbeddedGraphBlock.tsx src/components/preview/MarkdownPreview.tsx src/App.tsx src/components/layout/AppHeader.tsx
  git commit -m "feat(graph): embed user-authored interactive graphs in notes and retire standalone tab view"
  ```

---

### Task 4: Single-Pane LiveView Mode

**Files:**
- Modify: `src/components/editor/EditorToolbar.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/editor/LiveViewEditor.tsx`

**Interfaces:**
- Modifies: `ViewMode = 'split' | 'editor' | 'preview' | 'liveview'`
- Produces: `LiveViewEditor` providing unified single-surface editing with real-time rendering

- [ ] **Step 1: Update `ViewMode` in `EditorToolbar.tsx`**
  Add `'liveview'` to `ViewMode`.
  Add LiveView toggle button with icon (`Sparkles` or `Eye`) and tooltip `Live View (Word-like, Ctrl+E)`.
  Update view rotation order: `split` -> `liveview` -> `preview` -> `editor` -> `split`.

- [ ] **Step 2: Implement `LiveViewEditor.tsx`**
  Single-pane live editing surface:
  - Single main surface (no split columns).
  - Integrates direct inline editing with instant live preview of typography, MathJax SVGs, tables, task lists, and embedded graph blocks.
  - Supports synchronized cursor positioning and full autosave compatibility.

- [ ] **Step 3: Integrate `LiveViewEditor` in `src/App.tsx`**
  When `viewMode === 'liveview'`, render `LiveViewEditor` in the main workspace.

- [ ] **Step 4: Run test suite and typecheck**
  Run `pnpm exec tsc --noEmit` and `pnpm test`.
  Expected: PASS.

- [ ] **Step 5: Commit LiveView mode**
  ```bash
  git add src/components/editor/EditorToolbar.tsx src/components/editor/LiveViewEditor.tsx src/App.tsx
  git commit -m "feat(editor): implement Word-like single-pane LiveView mode"
  ```

---

### Task 5: GitHub Auto-Updater Module

**Files:**
- Create: `src/lib/updater.ts`
- Create: `src/test/updater.test.ts`
- Create: `src/components/updater/UpdateModal.tsx`
- Modify: `src/components/layout/AppHeader.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `checkAppUpdate(currentVersion: string): Promise<UpdateInfo>`
- Produces: `UpdateModal` component

- [ ] **Step 1: Write unit tests for version comparison in `src/test/updater.test.ts`**
  Test `isNewerVersion('0.2.0', '0.3.0') === true`, `isNewerVersion('0.2.0', '0.2.0') === false`, `isNewerVersion('0.2.0', '0.1.9') === false`, handling `v` prefixes (`v0.3.0`).

- [ ] **Step 2: Implement `src/lib/updater.ts`**
  Fetch `https://api.github.com/repos/nmkdeveloper/hoshinote/releases/latest`.
  Extract release tag, notes, release date, and target download asset.
  Add download launcher invoking `@tauri-apps/plugin-shell` (or browser fallback in dev mode).

- [ ] **Step 3: Create `UpdateModal.tsx`**
  Modal dialog showing:
  - New version tag and release name.
  - Formatted markdown changelog / release notes.
  - Release date badge.
  - "Download & Install" button and "Later" button.

- [ ] **Step 4: Integrate Update Check in `AppHeader.tsx` & `App.tsx`**
  - Add "Check for Updates" action in Header.
  - Optional unobtrusive update badge when a newer version is discovered.

- [ ] **Step 5: Run tests and verify**
  Run `pnpm test src/test/updater.test.ts`.
  Expected: PASS.

- [ ] **Step 6: Commit auto-updater module**
  ```bash
  git add src/lib/updater.ts src/test/updater.test.ts src/components/updater/UpdateModal.tsx src/components/layout/AppHeader.tsx src/App.tsx
  git commit -m "feat(updater): add GitHub releases auto-updater with changelog modal"
  ```

---

### Task 6: Complete English Documentation Suite

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `ARCHITECTURE.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Write `LICENSE`**
  Standard MIT License with copyright `2026 nmkdeveloper <nguyenminhkhoi.nmk.dev@gmail.com>`.

- [ ] **Step 2: Write comprehensive `README.md` in English**
  Include:
  - Hero header with Hoshino mascot logo and project description.
  - Key features matrix (CodeMirror 6, MathJax 3 Vector SVG, Embedded Graph DSL, LiveView, FTS5 Search, SQLite WAL, AES-256 Vault Encryption, Auto-Updater).
  - Visual preview references (`artifacts/screenshots/`).
  - Installation instructions (Windows, Linux, macOS).
  - Keyboard shortcuts table (`Ctrl+P`, `Ctrl+E`, `Ctrl+B`, `Ctrl+S`, `Ctrl+Shift+B`).
  - Development and testing workflow commands (`pnpm test`, `cargo test`, `pnpm run build`).

- [ ] **Step 3: Write `ARCHITECTURE.md` in English**
  Include:
  - System architecture diagram (Desktop Window <-> Tauri IPC <-> Rust Engine <-> SQLite).
  - Storage & FTS5 triggers breakdown.
  - MathJax SVG AST token-shielding compiler.
  - Embedded Graph DSL parser & physics simulation.
  - LiveView single-pane design.

- [ ] **Step 4: Write `CONTRIBUTING.md` in English**
  Code standards (TypeScript strict, rustfmt, clippy `-D warnings`, zero-warning policy, 4-tier E2E testing).

- [ ] **Step 5: Write `CHANGELOG.md` in English**
  Document changes for `v0.1.0`, `v0.2.0`, and `v0.3.0`.

- [ ] **Step 6: Commit documentation suite**
  ```bash
  git add README.md LICENSE CONTRIBUTING.md ARCHITECTURE.md CHANGELOG.md
  git commit -m "docs: add comprehensive English documentation suite (README, LICENSE, ARCHITECTURE, CONTRIBUTING, CHANGELOG)"
  ```

---

### Task 7: Full Verification & E2E Validation

- [ ] **Step 1: Run TypeScript strict check**
  `pnpm exec tsc --noEmit` -> Must return 0 errors.

- [ ] **Step 2: Run Vitest frontend test suite**
  `pnpm test` -> Must pass all tests.

- [ ] **Step 3: Run Opaque-Box E2E test suite**
  `node tests/e2e/runner.js` -> Must pass 78/78 tests (100%).

- [ ] **Step 4: Run Rust backend test suite**
  `cargo test --manifest-path src-tauri/Cargo.toml` -> Must pass all 40 tests.

- [ ] **Step 5: Run production Vite build**
  `pnpm run build` -> Verify clean bundles in `dist/`.
