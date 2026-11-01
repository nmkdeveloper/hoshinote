# Test Infrastructure Specification: Hoshinote E2E Testing Track

## 1. Test Philosophy: Opaque-Box & Requirement-Driven

The Hoshinote E2E testing framework is designed under strict **opaque-box, requirement-driven principles**:
- **Zero Coupling to Internal Implementation Details**: Tests interact exclusively with system interfaces defined in the project specification (`PROJECT.md` § Interface Contracts: Tauri IPC commands, data schemas, Markdown/MathJax output representations, and Graph data models).
- **Authoritative Expected Output Derivation**: Every test case derives expected results from formal mathematical properties, specification requirements in `PROJECT.md`, and an embedded Reference Oracle Engine (`HoshinoteReferenceEngine`).
- **Progressive Testability & Determinism**: Tests are isolated, repeatable, independent of execution order, and verifiable under both in-memory reference execution and live IPC environments.
- **Fail-Fast & Zero False Positives**: Test failures pinpoint specific contract violations, invariant breaks, or syntax rendering errors without relying on fragile DOM selector timing or brittle mocks.

---

## 2. Methodology

The test suite applies four rigorous software testing methodologies:

### A. Category-Partition Method
Input spaces for each feature (Note CRUD, Wikilinks, Search, Markdown, MathJax, Graph Drawer) are categorized into equivalence partitions:
- **Valid / Nominal partitions**: Standard note creation, simple wikilinks, exact query matches, standard markdown syntax, valid LaTeX formulas.
- **Invalid / Error partitions**: Malformed LaTeX syntax, invalid note IDs, unparseable wikilink tokens, corrupted search queries.
- **Structural partitions**: Heading anchors vs aliased links, inline `$math$` vs block `$$math$$`, orphan notes vs hub notes with multiple backlinks.

### B. Boundary Value Analysis (BVA)
Extremes and boundary transitions are probed systematically:
- Empty strings, whitespace-only content, and 100,000+ character notes.
- Special characters, unicode emojis, and filesystem-reserved symbols in titles.
- Transition points: 0 backlinks (orphan), 1 backlink, N backlinks (dynamic radius calculation).
- Dangling link resolution: note absent (unresolved: true) -> note created (unresolved: false).
- Currency collision boundaries: `$100 and $200` vs `$E=mc^2$`, escaped dollar signs `\$50`.
- Hop-depth neighborhoods: 0-hop (empty), 1-hop, 2-hop, 3-hop, and disconnected nodes.

### C. Pairwise Combinatorial Testing
Interaction effects between disparate features are verified across cross-feature intersections:
- **MathJax + Wikilinks**: Mathematical formulas embedded within wikilinked notes and target preview.
- **FTS5 Search + MathJax**: Querying notes using LaTeX tokens (`\frac`, `\sum`) and verifying snippet highlighting.
- **Renaming + Backlinks + Graph**: Renaming a note dynamically updates backlinks, resolves links, and updates graph topology.
- **Note Deletion + Graph + Dangling Links**: Deleting a target note cascades through incoming links, marking them unresolved and updating graph node radius.
- **Tags + Full-Text Search + Graph Filters**: Multi-faceted filtering where tag, search query, and orphan toggles interact simultaneously.

### D. Real-World Workload Testing
Realistic end-to-end usage scenarios simulating daily knowledge-worker and academic workflows:
- **STEM Lecture Vault**: Calculus and Classical Mechanics lecture series with cross-references and complex LaTeX equations.
- **Academic Research Vault**: Citation graph with aliased literature references and hub note backlink density.
- **Software Architecture Docs**: Service component notes with markdown tables, task lists, and unlinked draft specs.
- **Zettelkasten Knowledge Web**: Progressive linking, dangling placeholder resolution, and cluster emergence.
- **Full Lifecycle Stress Migration**: High-volume note creation, bulk tagging, search indexing, and consistency checks.

---

## 3. Feature Inventory & Coverage Mapping

The table below maps the Hoshinote Feature Inventory to the 4 test tiers:

| Feature ID | Feature Name | Tier 1: Feature Coverage | Tier 2: Boundary & Corner | Tier 3: Combinatorial | Tier 4: Real-World Scenarios |
|---|---|---|---|---|---|
| **F-04** | **Note Entity CRUD Core** | T1.01-T1.06 (Create, Get, GetByTitle, Update, Delete, List) | T2.01-T2.05 (Empty content, 100k length, special chars/emojis, duplicate titles, 50+ tags) | T3.03, T3.04, T3.08, T3.11 (Renaming, deletion cascade, archive/pinned flags, tag aggregation) | T4.01-T4.05 (Complete lifecycle in multi-note vaults) |
| **F-05** | **Obsidian Wikilinks Engine** | T1.07-T1.11 (Simple `[[A]]`, Aliased `[[A\|B]]`, Heading `[[A#H]]`, Dangling links, Backlinks) | T2.06-T2.10 (Empty `[[]]`, spaces & symbols in targets, self-links, circular links, dangling transition) | T3.01, T3.03, T3.04, T3.05, T3.12 (Math inside linked notes, rename sync, table/tasklist links) | T4.01-T4.04 (Cross-referencing papers, prerequisites, atomic slip-box) |
| **F-06** | **FTS5 Full-Text Search** | T1.12-T1.16 (Title search, Body search + snippet, Multi-term, Case-insensitivity, BM25 rank) | T2.11-T2.15 (Empty query, regex/punctuation symbols, non-existent terms, LaTeX search, 1k len query) | T3.02, T3.06, T3.08, T3.12 (Search matching LaTeX, tag+content filter, alias & heading search) | T4.02, T4.03, T4.05 (Vault-wide term search across 25+ notes) |
| **F-07** | **Markdown GFM Rendering** | T1.17-T1.21 (Headings, Lists/Quotes, Task lists, Tables, Code blocks) | T2.16-T2.20 (Malformed markdown, deep nesting, malformed tables, XSS escaping, empty string) | T3.01, T3.05, T3.09 (Wikilinks in tables, math in lists, mixed currency & math) | T4.01, T4.03 (Lecture notes with code & tables, architecture spec) |
| **F-08** | **MathJax TeX Formula Rendering** | T1.22-T1.26 (Inline `$f$`, Display `$$f$$`, Greek/matrices/fractions, multi-formula, AST integration) | T2.21-T2.25 (Currency `$100` vs math, escaped `\$50`, malformed LaTeX, empty `$$`, extreme depth) | T3.01, T3.02, T3.09 (Math in linked notes, math FTS token search, math + currency) | T4.01 (Calculus derivatives, integrals, and physics equations) |
| **F-10 / F-11** | **Interactive Graph Drawer & Filters** | T1.27-T1.31 (Nodes/links extraction, dynamic radius, orphan detection, Catppuccin tags, hop depth) | T2.26-T2.30 (Empty vault, fully disconnected graph, complete clique, dangling-only node, orphan hop) | T3.03, T3.04, T3.07, T3.10 (Rename topology update, delete edge removal, tag filter + hop depth) | T4.01-T4.04 (Cluster analysis, hub note sizing, citation network) |

---

## 4. Test Tier Architecture

The test suite is organized into modular files within `tests/e2e/`:

```
tests/e2e/
├── runner.js                      # Independent CLI test runner (exit 0 on pass, non-zero on fail)
├── engine/
│   └── hoshinote_reference.js     # Authoritative Reference Oracle Engine (PROJECT.md contract compliant)
├── adapters/
│   └── adapter_interface.js       # Adapter factory (Reference Engine & Tauri IPC bridge)
├── tiers/
│   ├── tier1_features.js          # Tier 1: 31 Feature Coverage test cases
│   ├── tier2_boundaries.js        # Tier 2: 30 Boundary & Corner test cases
│   ├── tier3_combinations.js      # Tier 3: 12 Pairwise Cross-Feature test cases
│   └── tier4_scenarios.js         # Tier 4: 5 Real-World Workload Scenarios
└── utils/
    └── assert.js                  # Assertion library and reporting formatters
```

---

## 5. Execution & Verification

### Running the Test Suite
The test runner is completely self-contained and requires only Node.js (v18+ / v20+ / v22+ / v26+):

```bash
# Direct Node execution
node tests/e2e/runner.js

# Or via package manager (configured in package.json)
pnpm test:e2e
# or
npm.cmd run test:e2e
```

### CLI Options
- `node tests/e2e/runner.js` — Run all 4 tiers (Tiers 1 to 4).
- `node tests/e2e/runner.js --tier=1` — Run Tier 1 only.
- `node tests/e2e/runner.js --tier=2` — Run Tier 2 only.
- `node tests/e2e/runner.js --tier=3` — Run Tier 3 only.
- `node tests/e2e/runner.js --tier=4` — Run Tier 4 only.
- `node tests/e2e/runner.js --filter=<pattern>` — Run tests matching specific regex pattern.
- `node tests/e2e/runner.js --verbose` — Display detailed assertion diagnostics and step outputs.

### Exit Semantics
- **Exit Code 0**: All test cases passed with zero assertions failed.
- **Exit Code 1**: One or more test cases failed; summary displays detailed stack traces, expected vs actual values, and failing tier.
