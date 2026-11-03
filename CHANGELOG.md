# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.0] - 2026-11-03

### Added
- **User-Authored Markdown Graph Blocks**: Notes can now directly embed interactive force-directed 2D canvas graphs via ```` ```graph ```` and ```` ```mermaid ```` code blocks with dynamic node drag, pan, zoom, and edge labels.
- **Single-Pane Word-like LiveView Mode**: Added `liveview` view mode alongside Split, Edit, and Preview, offering a seamless single-pane document surface where formatting, math equations, tables, and graphs render in real-time.
- **GitHub Auto-Updater Module**: Built-in update checker querying GitHub Releases API with release changelog modal and 1-click installer download launch via Tauri shell.
- **New App Mascot Branding**: Updated application icon, favicons, and window assets with the Hoshino mascot logo across Windows, Linux, macOS, Android, and iOS.
- **Comprehensive Documentation Suite**: Added `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `ARCHITECTURE.md`, and `CHANGELOG.md`.

### Changed
- **Node & React Upgrade**: Upgraded to Node.js `22.x LTS` runtime standards and React 19 (`react@^19.0.0`, `react-dom@^19.0.0`).
- **Retired Standalone Graph Tab View**: Removed the obsolete full-screen graph tab and bottom dock drawer from the main UI in favor of focused, note-embedded graph widgets, improving overall app bundle size by over 30%.
- **Updated GitHub Actions**: Upgraded CI/CD workflows to Node.js 22 LTS.

---

## [0.2.0] - 2026-11-02

### Added
- **Pure Monochrome Themes**: Added High-Contrast Monochrome Dark and Pure Paper Monochrome Light themes.
- **Custom Theme Import & Export**: Users can export their custom color palettes to `.json` files and import them across machines.
- **Dynamic Theme Propagation**: Dynamic theme color mapping across QuickSwitcher modal, Backlinks panel, and Editor toolbar.
- **Heading Typography**: Custom heading typography styling and CodeMirror 6 markdown fold support.
- **Note Zip Export**: Export note content along with media attachments directly to a `.zip` archive.

### Fixed
- Cryptographically secure 96-bit random nonces for SQLite database encryption snapshots (`aes-gcm`).
- Syntax token escaping inside live markdown preview.
- Tailwind JIT regex syntax warnings during production Vite build.

---

## [0.1.0] - 2026-11-01

### Added
- **Initial Desktop Scaffolding**: Tauri 2.0 + Rust + Vite + TypeScript + React desktop application.
- **SQLite Database Engine**: Embedded `rusqlite` bundled database configured with WAL journal mode and foreign keys ON.
- **Obsidian-Style Wikilinks**: Parsing for `[[Note]]`, `[[Note|Alias]]`, `[[Note#Heading]]`, and automated dangling link resolution.
- **SQLite FTS5 Full-Text Search**: Sub-millisecond full-text search with BM25 ranking and context snippet generation.
- **Vector SVG MathJax 3**: Inline `$math$` and block `$$math$$` mathematical typography rendered as pure SVG vector paths.
- **CodeMirror 6 Editor**: Split-view editor with synchronized scrolling, 350ms debounced autosave, and keyboard shortcuts.
- **E2E Opaque-Box Test Suite**: 78 test cases across 4 tiers verifying CRUD, wikilinks, math, search, and graph algorithms.
