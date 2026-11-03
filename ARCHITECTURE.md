# Hoshinote Architecture & Technical Specification

This document provides an in-depth breakdown of the technical design, data structures, and runtime mechanics of **Hoshinote**.

---

## 1. System Philosophy: Local-First & Dual-Mode Runtime

Hoshinote is engineered around strict **Local-First** principles:
- All notes, links, tags, and full-text search indexes reside in an embedded in-process SQLite database on the local filesystem (`hoshinote.db`).
- Zero telemetry, zero cloud synchronizer overhead, and zero external CDN font/asset dependencies.
- **Dual-Mode IPC Dispatcher (`src/lib/api.ts`)**:
  - When hosted inside Tauri 2.0 (`window.__TAURI_INTERNALS__` present): Calls compile directly to Rust IPC commands via `@tauri-apps/api/core`.
  - When hosted in a browser / headless preview: The API automatically activates an in-memory `MockDatabase` adhering to identical interface contracts, enabling standalone component development and instant test suite execution.

---

## 2. Backend Architecture (Rust & SQLite)

The backend is compiled as a static/cdylib native library (`hoshinote_lib`) and executable (`hoshinote`) under `src-tauri`.

### 2.1 Database Configuration (`src-tauri/src/db/connection.rs`)
The SQLite engine is compiled via `rusqlite` with the `bundled` feature (SQLite 3.45+). Every database connection is initialized with high-performance production PRAGMAs:
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB memory page cache
```

### 2.2 Schema & Automated Triggers (`src-tauri/src/db/schema.rs`)
- `notes`: Stores primary note metadata (`id`, `title COLLATE NOCASE`, `content`, `path`, `is_pinned`, `is_archived`).
- `links`: Stores unidirectional and bidirectional graph relationships (`source_id`, `target_id`, `target_title`, `alias`, `heading`).
- `tags` & `note_tags`: Normalized tag taxonomy supporting nested hierarchical tags (`#science/physics`).
- `notes_fts`: SQLite FTS5 virtual table tokenized via `unicode61 remove_diacritics 1`.

#### Dangling Link Resolution Trigger:
When a note is created or renamed, triggers automatically resolve dangling links whose `target_title` matches:
```sql
CREATE TRIGGER IF NOT EXISTS trg_notes_relink_insert AFTER INSERT ON notes BEGIN
    UPDATE links
    SET target_id = new.id
    WHERE target_title = new.title COLLATE NOCASE AND target_id IS NULL;
END;
```

#### FTS5 Synchronization Triggers:
```sql
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(note_id, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE OF title, content ON notes BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
    INSERT INTO notes_fts(note_id, title, content) VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE note_id = old.id;
END;
```

### 2.3 Search & BM25 Ranking (`src-tauri/src/db/search.rs`)
- **FTS Query Sanitizer**: Strips unbalanced boolean operators and control punctuation (`()`, `{}`, `*`, `^`, `~`) to safeguard the SQLite query engine against syntax crashes.
- **BM25 Relevance**: Assigns positive ranking scores with higher weight on title matches over content matches, returning snippet context surrounded by `<mark>` tags.
- **Graceful Fallback**: Automatically reverts to `LIKE %query%` pattern matching if FTS tokenization encounters non-indexable edge cases.

### 2.4 Vault Snapshot Encryption (`src-tauri/src/db/crypto.rs`)
- Machine-local 256-bit key derivation (`hoshinote.key`).
- `AES-256-GCM` authenticated payload format:
  `[VAULT_HEADER (22 bytes)] + [NONCE (12 bytes)] + [CIPHERTEXT + 16-byte AUTH TAG]`
- Automatically flushes SQLite WAL and creates an encrypted backup `hoshinote.db.enc` on write operations.

---

## 3. Frontend Architecture (React 19 & TypeScript)

### 3.1 Token-Shielded Markdown & MathJax Compiler (`src/lib/markdown.ts`)
The Markdown compilation pipeline runs in 6 distinct shielded phases:
1. **Fenced Codeblock Shielding**: Converts codeblocks (or embedded graph/mermaid directives) into indexed placeholders `___HOSHINOTE_TOKEN_N___`.
2. **Inline Code Shielding**: Converts `` `inline code` `` into placeholders.
3. **LaTeX MathJax Rendering**: Inline `$formula$` and block `$$formula$$` are processed through MathJax 3 with LiteAdaptor, outputting pure vector `<svg>` nodes with accessible `<title>` attributes.
4. **Currency Protection**: Regular expressions distinguish genuine currency formats (`$100`, `$50-$100`) from mathematical expressions (`$E=mc^2$`).
5. **AST Transformations**: GFM tables, task lists, blockquotes, and Obsidian wikilinks are formatted.
6. **Token Restoration & XSS Sanitization**: Restores shielded code and math tokens, and runs multi-vector sanitization removing `<script>`, `<iframe>`, and dangerous `on*` event handlers.

### 3.2 User-Authored Markdown Graphs (`src/lib/graphParser.ts` & `EmbeddedGraphBlock.tsx`)
Notes can embed custom diagrams using ```` ```graph ```` code blocks:
```markdown
```graph
Frontend -> Backend: IPC
Backend -> SQLite: SQL
Backend -> Vault: AES-256
```
```
- The parser compiles directed links (`->`, `-->`), edge labels (`: label`), bracketed names (`[Node A]`), and isolated nodes into graph vertices and edges.
- `EmbeddedGraphBlock` mounts an interactive HTML5 canvas running a 2D Verlet force-directed physics simulation with zoom, pan, and node-dragging capabilities.

### 3.3 LiveView Architecture (`src/components/editor/LiveViewEditor.tsx`)
In addition to traditional `split`, `editor`, and `preview` modes, Hoshinote provides a unified `liveview` mode:
- Single-pane Word-style document canvas.
- Typography, MathJax equations, checklists, tables, and embedded graphs render live directly inside the document.
- In-place editing toggle and double-click to edit seamlessly bridge editing and viewing into one fluid canvas.

### 3.4 GitHub Auto-Updater (`src/lib/updater.ts` & `UpdateModal.tsx`)
- Queries `https://api.github.com/repos/nmkdeveloper/hoshinote/releases/latest`.
- Compares release tag with local application version using semver.
- Displays full release changelog and provides 1-click installer launch via `@tauri-apps/plugin-shell`.
