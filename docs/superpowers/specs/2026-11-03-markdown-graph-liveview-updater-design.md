# Design Document: Embedded Markdown Graph, LiveView Mode, GitHub Auto-Updater, and Documentation Suite

**Date**: 2026-11-03  
**Author**: Antigravity & nmkdeveloper  
**Status**: DRAFT - PENDING APPROVAL  
**Target Release**: v0.3.0  

---

## 1. Intent and Why

Hoshinote is evolving from a dual-pane editor with a separate app-wide database graph into a unified, distraction-free knowledge environment:
1. **User-Authored Markdown Graphs**: Instead of enforcing an automated database topology view in a separate tab, knowledge workers often want to illustrate ad-hoc diagrams, mind maps, and system architectures directly inside their notes using plain text.
2. **Single-Pane LiveView (Word-like WYSIWYG)**: Authors need a clean, single-surface editing mode where Markdown formatting, MathJax formulas, and task lists render in-place as they type without demanding split-screen cognitive overhead.
3. **GitHub Auto-Updater**: Desktop users need effortless discovery and installation of new releases published to `nmkdeveloper/hoshinote`.
4. **Complete English Documentation Suite**: A production-grade open-source repository requires authoritative `README.md`, `LICENSE`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, and `CHANGELOG.md`.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Embedded Graph Blocks in Markdown**:
  - Render ```` ```graph ```` blocks into dynamic, force-directed interactive 2D canvas widgets where users define nodes and relations (e.g. `A -> B: label`, `[Source] -> [Target]`) with drag, zoom, and pan capabilities.
  - Render ```` ```mermaid ```` blocks into standard vector SVG diagrams (flowcharts, sequence diagrams, class diagrams).
  - Cleanly remove the obsolete standalone Graph tab view, Header graph view toggles, and Dock drawer from `App.tsx` and layout components.
- **Single-Pane LiveView Mode**:
  - Add `liveview` to `ViewMode` (`split | editor | preview | liveview`).
  - In `liveview`, display a single unified editing surface. As the user types, block-level and inline elements (headings, bold, math expressions, lists, tables) are decorated and rendered directly in-place.
- **GitHub Auto-Updater**:
  - Add a lightweight, reliable updater service checking GitHub Releases API (`https://api.github.com/repos/nmkdeveloper/hoshinote/releases/latest`).
  - UI notification in AppHeader / StatusBar when an update is available, displaying release notes, tag name, and download / update action.
- **Complete English Documentation Suite**:
  - Deliver exhaustive, polished English documentation (`README.md`, `LICENSE` MIT, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md`).

### Non-Goals
- Eliminating Wikilink extraction or SQLite backlink querying: Backlinks in the inspector panel remain active because note cross-referencing is core to the Zettelkasten note system.
- Heavy Electron-style overhead: Keep all new additions lightweight and dependency-efficient.

### Anti-Goals
- Breaking existing note storage or SQLite schemas.
- Freezing UI or introducing network lag during offline note editing.

---

## 3. Approaches Considered & Selected

### Feature 1: Embedded Markdown Graph Blocks
- **Approach C (Dual Engine - SELECTED)**: Support both:
  1. ```` ```graph ````: Parsed with an ultra-lightweight DSL parser (`Node A -> Node B: description`, `[Start] -> [End]: label`), rendered via an embedded interactive HTML5 canvas graph widget with zoom/pan/drag.
  2. ```` ```mermaid ````: Parsed and rendered via Mermaid SVG renderer.
- **Architectural Scope**: Standalone Graph tab view, graph dock drawer, and graph navigation controls in `App.tsx` and `AppHeader.tsx` are completely retired. The app does not load or hold global graph state on note switch. Rust backend services remain intact to guarantee 100% test pass rate across `cargo test` and E2E suites.

### Feature 2: LiveView (Word-Like Single Pane)
- **Approach B (Seamless Single-Pane Live Editing - SELECTED)**:
  - Add `liveview` to `ViewMode`.
  - In `liveview`, only ONE main pane is visible (no split screen). The pane provides a rich, single-surface live-rendered view where edits reflect in real time with styled typography, live MathJax formulas, tables, checklists, and embedded graph blocks, offering an intuitive Word/Typora-like workflow.

### Feature 3: GitHub Auto-Updater
- **Approach B (GitHub Releases REST Engine with Shell Launch - SELECTED)**:
  - Frontend `src/lib/updater.ts` queries `https://api.github.com/repos/nmkdeveloper/hoshinote/releases/latest`.
  - Compares semantic versioning against current app version (`0.2.0`).
  - Provides an `UpdateModal` dialog displaying release tag, release notes, and a direct download button that launches the download asset URL via `@tauri-apps/plugin-shell` (or standard browser navigation in dev mode). This avoids elevated privilege issues and cross-platform binary streaming failures.

---

## 4. Component Changes & Architecture

### A. Removal of Standalone Graph Tab View & Layout Simplification
- In `src/App.tsx`:
  - Remove `currentView: 'editor' | 'graph'` and related view switching logic. Always stay in editor/workspace view.
  - Remove `isGraphDockOpen` and dock bottom drawer.
  - Simplify `AppHeader.tsx`: Remove "Graph View" tab button; retain LiveView / ViewMode toggles and Add "Check for Updates" button.
  - Remove unused full-screen Graph view render branch in `App.tsx`.

### B. Embedded Graph Blocks in `MarkdownPreview.tsx` & `LiveView`
- Custom renderer for fenced codeblocks in `src/lib/markdown.ts`:
  - When language is `graph`: Render container `<div class="embedded-graph-container" data-graph-source="..."></div>` hydrated with interactive canvas component.
  - When language is `mermaid`: Render SVG container `<div class="embedded-mermaid-container">...</div>`.
- Provide DSL parser for ```` ```graph ````:
  - Lines like `A -> B`, `[Node 1] -> [Node 2]: label`, `Node { color: #f38ba8 }`.
  - Converts to `{ nodes: [...], links: [...] }` and mounts an interactive canvas block.

### C. LiveView Implementation
- In `src/components/editor/EditorToolbar.tsx`:
  - Add `liveview` button with icon (`Eye` or `Sparkles` or `FileText`).
  - Update `ViewMode = 'split' | 'editor' | 'preview' | 'liveview'`.
- In `src/components/editor/NoteEditor.tsx`:
  - When `viewMode === 'liveview'`, enable inline formatting extensions or hybrid live preview with seamless single-surface rendering.

### D. GitHub Auto-Updater Module (`src/lib/updater.ts` & `src/components/updater`)
- Fetch `https://api.github.com/repos/nmkdeveloper/hoshinote/releases/latest`.
- Compare release `tag_name` (e.g. `v0.3.0`) against current package version (`0.2.0`).
- Modal component `UpdateModal.tsx` showing release name, body, release date, and download asset link.

### E. Documentation Suite
- `README.md`: Badges, hero summary, key features, quick start, shortcuts, architecture diagram.
- `LICENSE`: MIT License with copyright `2026 nmkdeveloper`.
- `CONTRIBUTING.md`: Workflow, code standards (Rust clippy, tsc, vitest, e2e), PR guide.
- `ARCHITECTURE.md`: High-level diagram, IPC bridge, database triggers, MathJax SVG AST pipeline, Graph DSL, LiveView design.
- `CHANGELOG.md`: Detailed changelog for v0.1.0, v0.2.0, and v0.3.0.

---

## 5. Verification Plan

1. **TypeScript Typecheck**: `pnpm exec tsc --noEmit` must pass with 0 errors.
2. **Vitest Unit Tests**: All existing tests updated for removed standalone graph tab + new tests for embedded graph DSL parser and updater module.
3. **E2E Tests**: Verify all 78 tests pass without regression.
4. **Rust Unit Tests**: `cargo test` in `src-tauri` passes 100%.
5. **Vite Production Build**: `pnpm run build` generates clean bundles.
