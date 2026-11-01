/**
 * Tier 2: Boundary & Corner Cases Test Suite
 *
 * Covers boundary values, extremes, malformed inputs, and adversarial conditions:
 * - Note CRUD Boundaries (5 tests)
 * - Wikilinks Boundaries (5 tests)
 * - Search Boundaries (5 tests)
 * - Markdown Boundaries (5 tests)
 * - MathJax Boundaries (5 tests)
 * - Graph Drawer Boundaries (5 tests)
 * Total: 30 tests.
 */

import { assert } from '../utils/assert.js';
import { createAppInstance } from '../adapters/adapter_interface.js';

export const tier2Tests = [
  // ==========================================
  // Note CRUD Boundaries
  // ==========================================
  {
    id: 'T2.01',
    name: 'Note CRUD - Empty note content allowed with valid title',
    category: 'Note CRUD Boundaries',
    async run() {
      const app = createAppInstance();
      const created = await app.createNote({ title: 'Blank Canvas', content: '' });
      assert.strictEqual(created.note.title, 'Blank Canvas');
      assert.strictEqual(created.note.content, '');
      assert.strictEqual(created.outgoing_links.length, 0);
    }
  },
  {
    id: 'T2.02',
    name: 'Note CRUD - Extreme note content length (100,000+ characters)',
    category: 'Note CRUD Boundaries',
    async run() {
      const app = createAppInstance();
      const hugeContent = 'Lorem ipsum dolor sit amet. '.repeat(4000); // ~112,000 chars
      assert.isAbove(hugeContent.length, 100000);

      const created = await app.createNote({
        title: 'Huge Monolith Document',
        content: hugeContent
      });

      const fetched = await app.getNote(created.note.id);
      assert.strictEqual(fetched.note.content.length, hugeContent.length);

      // Search within huge note
      const results = await app.searchNotes('Lorem ipsum');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Huge Monolith Document');
    }
  },
  {
    id: 'T2.03',
    name: 'Note CRUD - Special characters, filesystem symbols, and emojis in title',
    category: 'Note CRUD Boundaries',
    async run() {
      const app = createAppInstance();
      const complexTitle = '🚀 Rocket [v2.0]: Math & Science / Cost ($) ~ 100% #1 ✨';
      const created = await app.createNote({
        title: complexTitle,
        content: 'Testing exotic Unicode symbols and punctuation in titles.'
      });

      const fetched = await app.getNote(created.note.id);
      assert.strictEqual(fetched.note.title, complexTitle);

      const byTitle = await app.getNoteByTitle(complexTitle);
      assert.ok(byTitle);
      assert.strictEqual(byTitle.note.id, created.note.id);
    }
  },
  {
    id: 'T2.04',
    name: 'Note CRUD - Duplicate title conflict rejection',
    category: 'Note CRUD Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Unique Title 1', content: 'First instance' });

      assert.throws(() => {
        app.engine.createNote({ title: 'Unique Title 1', content: 'Second instance' });
      }, /already exists/i, 'Should reject duplicate note title creation');

      // Also reject update to another existing note title
      const note2 = await app.createNote({ title: 'Unique Title 2', content: 'Second note' });
      assert.throws(() => {
        app.engine.updateNote(note2.note.id, { title: 'unique title 1' });
      }, /already exists/i, 'Should reject updating note title to existing one');
    }
  },
  {
    id: 'T2.05',
    name: 'Note CRUD - Extreme number of tags (50+ tags) on single note',
    category: 'Note CRUD Boundaries',
    async run() {
      const app = createAppInstance();
      const tagsList = Array.from({ length: 60 }, (_, i) => `tag_index_${i}`);
      const content = tagsList.map(t => `#${t}`).join(' ');

      const created = await app.createNote({
        title: 'Heavily Tagged Index',
        content
      });

      assert.isAtLeast(created.tags.length, 50);

      const allTags = await app.getAllTags();
      assert.isAtLeast(allTags.length, 50);
    }
  },

  // ==========================================
  // Obsidian Wikilinks Boundaries
  // ==========================================
  {
    id: 'T2.06',
    name: 'Wikilinks - Empty brackets [[]] or whitespace [[  ]] ignored safely',
    category: 'Wikilinks Boundaries',
    async run() {
      const app = createAppInstance();
      const text = 'Here is an empty link [[]] and a whitespace link [[   ]] in text.';
      const parsed = app.parseWikilinks(text);
      assert.strictEqual(parsed.length, 0, 'Empty wikilink brackets must be ignored');
    }
  },
  {
    id: 'T2.07',
    name: 'Wikilinks - Targets containing spaces, ampersands, slashes, and numbers',
    category: 'Wikilinks Boundaries',
    async run() {
      const app = createAppInstance();
      const targetTitle = 'Project / Sub-Plan & Budget (2026)';
      await app.createNote({ title: targetTitle, content: 'Details.' });

      const parsed = app.parseWikilinks(`See [[${targetTitle}|The 2026 Plan]].`);
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].target_title, targetTitle);
      assert.strictEqual(parsed[0].alias, 'The 2026 Plan');

      const source = await app.createNote({
        title: 'Overview',
        content: `Check [[${targetTitle}]].`
      });

      assert.strictEqual(source.outgoing_links[0].is_unresolved, false);
    }
  },
  {
    id: 'T2.08',
    name: 'Wikilinks - Self-referential wikilink (note linking to itself)',
    category: 'Wikilinks Boundaries',
    async run() {
      const app = createAppInstance();
      const selfNote = await app.createNote({
        title: 'Recursive Definition',
        content: 'A note that links to [[Recursive Definition]] without infinite recursion.'
      });

      assert.strictEqual(selfNote.outgoing_links.length, 1);
      assert.strictEqual(selfNote.outgoing_links[0].target_id, selfNote.note.id);
      assert.strictEqual(selfNote.outgoing_links[0].is_unresolved, false);

      const backlinks = await app.getBacklinks(selfNote.note.id);
      assert.strictEqual(backlinks.length, 1);
      assert.strictEqual(backlinks[0].source_id, selfNote.note.id);
    }
  },
  {
    id: 'T2.09',
    name: 'Wikilinks - Circular mutual references (Note A <-> Note B)',
    category: 'Wikilinks Boundaries',
    async run() {
      const app = createAppInstance();
      const noteA = await app.createNote({
        title: 'Concept A',
        content: 'Complementary to [[Concept B]].'
      });
      const noteB = await app.createNote({
        title: 'Concept B',
        content: 'Complementary to [[Concept A]].'
      });

      const backlinksA = await app.getBacklinks(noteA.note.id);
      const backlinksB = await app.getBacklinks(noteB.note.id);

      assert.strictEqual(backlinksA.length, 1);
      assert.strictEqual(backlinksA[0].source_title, 'Concept B');
      assert.strictEqual(backlinksB.length, 1);
      assert.strictEqual(backlinksB[0].source_title, 'Concept A');
    }
  },
  {
    id: 'T2.10',
    name: 'Wikilinks - Dangling link transition when target note created later',
    category: 'Wikilinks Boundaries',
    async run() {
      const app = createAppInstance();
      // Step 1: Create source note linking to future note
      const source = await app.createNote({
        title: 'Early Draft',
        content: 'Needs input from [[Future Implementation Guide]].'
      });
      assert.strictEqual(source.outgoing_links[0].is_unresolved, true);
      assert.strictEqual(source.outgoing_links[0].target_id, null);

      // Step 2: Create target note later
      const target = await app.createNote({
        title: 'Future Implementation Guide',
        content: 'Official guide.'
      });

      // Step 3: Verify source note link transitioned to resolved
      const sourceUpdated = await app.getNote(source.note.id);
      assert.strictEqual(sourceUpdated.outgoing_links[0].is_unresolved, false);
      assert.strictEqual(sourceUpdated.outgoing_links[0].target_id, target.note.id);

      // Step 4: Verify backlinks on target
      const targetBacklinks = await app.getBacklinks(target.note.id);
      assert.strictEqual(targetBacklinks.length, 1);
      assert.strictEqual(targetBacklinks[0].source_title, 'Early Draft');
    }
  },

  // ==========================================
  // FTS5 Search Boundaries
  // ==========================================
  {
    id: 'T2.11',
    name: 'Search - Empty or whitespace query returns empty array safely',
    category: 'Search Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Sample', content: 'Sample text' });

      const res1 = await app.searchNotes('');
      const res2 = await app.searchNotes('   ');
      const res3 = await app.searchNotes('\t\n');

      assert.strictEqual(res1.length, 0);
      assert.strictEqual(res2.length, 0);
      assert.strictEqual(res3.length, 0);
    }
  },
  {
    id: 'T2.12',
    name: 'Search - Punctuation and regex metacharacters (*, +, ?, (, ), [, ], \\)',
    category: 'Search Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Regex Notes',
        content: 'Matching patterns like (a+b)* and [0-9]? with \\d escape.'
      });

      // Punctuation should not crash the engine
      const res1 = await app.searchNotes('(a+b)*');
      assert.strictEqual(res1.length, 1);

      const res2 = await app.searchNotes('[0-9]?');
      assert.strictEqual(res2.length, 1);

      const res3 = await app.searchNotes('***');
      assert.strictEqual(Array.isArray(res3), true);
    }
  },
  {
    id: 'T2.13',
    name: 'Search - Non-existent query term returns empty result set without errors',
    category: 'Search Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Topic One', content: 'Normal content' });

      const res = await app.searchNotes('xyznonexistentterm999');
      assert.strictEqual(res.length, 0);
    }
  },
  {
    id: 'T2.14',
    name: 'Search - Queries matching specific LaTeX syntax tokens',
    category: 'Search Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Integral Calculus',
        content: 'Formula: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$'
      });
      await app.createNote({
        title: 'Algebra',
        content: 'Formula: $x^2 + y^2 = r^2$'
      });

      const res = await app.searchNotes('\\int');
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].title, 'Integral Calculus');

      const resSqrt = await app.searchNotes('\\sqrt');
      assert.strictEqual(resSqrt.length, 1);
      assert.strictEqual(resSqrt[0].title, 'Integral Calculus');
    }
  },
  {
    id: 'T2.15',
    name: 'Search - Extreme query length (1,000+ characters) without crash or timeout',
    category: 'Search Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Standard', content: 'Text content.' });

      const longQuery = 'queryterm '.repeat(150); // > 1,000 chars
      assert.isAbove(longQuery.length, 1000);

      const res = await app.searchNotes(longQuery);
      assert.strictEqual(Array.isArray(res), true);
    }
  },

  // ==========================================
  // Markdown GFM Boundaries
  // ==========================================
  {
    id: 'T2.16',
    name: 'Markdown - Malformed and unclosed formatting tags handled safely',
    category: 'Markdown Boundaries',
    async run() {
      const app = createAppInstance();
      const broken = '**Unclosed bold text and `unclosed backticks\n```rust\nlet x = 1;';
      const html = app.renderMarkdown(broken);
      assert.strictEqual(typeof html, 'string');
      assert.ok(html.length > 0);
    }
  },
  {
    id: 'T2.17',
    name: 'Markdown - Deeply nested elements (nested lists and blockquotes)',
    category: 'Markdown Boundaries',
    async run() {
      const app = createAppInstance();
      const nested = '> > > Level 3 quote\n- Level 1\n  - Level 2\n    - Level 3';
      const html = app.renderMarkdown(nested);
      assert.ok(html.includes('<blockquote>'));
      assert.ok(html.includes('<li>'));
    }
  },
  {
    id: 'T2.18',
    name: 'Markdown - Malformed table missing delimiter or pipe columns',
    category: 'Markdown Boundaries',
    async run() {
      const app = createAppInstance();
      const badTable = '| Column 1 | Column 2 |\n| broken data without pipes\n| Next | Row |';
      const html = app.renderMarkdown(badTable);
      assert.strictEqual(typeof html, 'string');
    }
  },
  {
    id: 'T2.19',
    name: 'Markdown - XSS sanitization strips dangerous script and event attributes',
    category: 'Markdown Boundaries',
    async run() {
      const app = createAppInstance();
      const malicious = '<script>alert("XSS")</script><img src="x" onerror="evil()" />\n# Clean Header';
      const html = app.renderMarkdown(malicious);
      assert.strictEqual(html.includes('<script>'), false, 'Script tags must be stripped');
      assert.strictEqual(html.includes('onerror='), false, 'Event attributes must be stripped');
      assert.ok(html.includes('<h1>Clean Header</h1>'));
    }
  },
  {
    id: 'T2.20',
    name: 'Markdown - Empty or null markdown returns empty string',
    category: 'Markdown Boundaries',
    async run() {
      const app = createAppInstance();
      assert.strictEqual(app.renderMarkdown(''), '');
      assert.strictEqual(app.renderMarkdown(null), '');
      assert.strictEqual(app.renderMarkdown(undefined), '');
    }
  },

  // ==========================================
  // MathJax TeX Boundaries
  // ==========================================
  {
    id: 'T2.21',
    name: 'MathJax - Currency symbol differentiation: $100 and $200 not treated as math',
    category: 'MathJax Boundaries',
    async run() {
      const app = createAppInstance();
      const text = 'The item costs $100 and another is $200 in total.';
      const rendered = app.parseMarkdownWithMath(text);
      assert.strictEqual(rendered.includes('<svg class="math-inline"'), false, 'Currency numbers must not render as MathJax SVG');
      assert.ok(rendered.includes('$100'));
      assert.ok(rendered.includes('$200'));
    }
  },
  {
    id: 'T2.22',
    name: 'MathJax - Escaped dollar signs \\$50 render as literal $50',
    category: 'MathJax Boundaries',
    async run() {
      const app = createAppInstance();
      const text = 'Discount price: \\$50 only.';
      const rendered = app.parseMarkdownWithMath(text);
      assert.ok(rendered.includes('$50'));
      assert.strictEqual(rendered.includes('\\$50'), false);
    }
  },
  {
    id: 'T2.23',
    name: 'MathJax - Malformed LaTeX with unbalanced braces renders error indicator',
    category: 'MathJax Boundaries',
    async run() {
      const app = createAppInstance();
      const brokenLatex = '\\frac{a}{b'; // Missing closing brace
      const rendered = app.renderMath(brokenLatex, false);
      assert.ok(rendered.includes('class="math-error"'));
      assert.ok(rendered.includes('Unbalanced braces'));
    }
  },
  {
    id: 'T2.24',
    name: 'MathJax - Empty math delimiters $$ and $$$$ handled safely',
    category: 'MathJax Boundaries',
    async run() {
      const app = createAppInstance();
      const rendered1 = app.renderMath('', false);
      const rendered2 = app.renderMath('   ', true);
      assert.strictEqual(rendered1, '');
      assert.strictEqual(rendered2, '');
    }
  },
  {
    id: 'T2.25',
    name: 'MathJax - Deeply nested fraction formulas render valid SVG without overflow',
    category: 'MathJax Boundaries',
    async run() {
      const app = createAppInstance();
      const deepLatex = '\\frac{1}{\\frac{2}{\\frac{3}{\\frac{4}{5}}}}';
      const rendered = app.renderMath(deepLatex, true);
      assert.ok(rendered.includes('<div class="math-display">'));
      assert.ok(rendered.includes('viewBox='));
    }
  },

  // ==========================================
  // Graph Drawer Boundaries
  // ==========================================
  {
    id: 'T2.26',
    name: 'Graph Drawer - Empty vault returns empty nodes and links arrays',
    category: 'Graph Drawer Boundaries',
    async run() {
      const app = createAppInstance();
      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 0);
      assert.strictEqual(graph.links.length, 0);
    }
  },
  {
    id: 'T2.27',
    name: 'Graph Drawer - Disconnected graph: multiple orphan notes with 0 links',
    category: 'Graph Drawer Boundaries',
    async run() {
      const app = createAppInstance();
      for (let i = 1; i <= 8; i++) {
        await app.createNote({ title: `Isolated Idea ${i}`, content: `Note body ${i}` });
      }

      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 8);
      assert.strictEqual(graph.links.length, 0);
      for (const node of graph.nodes) {
        assert.strictEqual(node.is_orphan, true);
        assert.strictEqual(node.connections_count, 0);
        assert.strictEqual(node.radius, 4); // base radius
      }
    }
  },
  {
    id: 'T2.28',
    name: 'Graph Drawer - Dense complete clique graph K4 (every note links to all others)',
    category: 'Graph Drawer Boundaries',
    async run() {
      const app = createAppInstance();
      const titles = ['Clique A', 'Clique B', 'Clique C', 'Clique D'];
      const notes = [];

      for (const title of titles) {
        notes.push(await app.createNote({ title, content: 'Placeholder' }));
      }

      // Link each note to all other 3 notes
      for (let i = 0; i < 4; i++) {
        const others = titles.filter((_, idx) => idx !== i);
        const linkContent = others.map(t => `[[${t}]]`).join(' and ');
        await app.updateNote(notes[i].note.id, { content: linkContent });
      }

      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 4);
      // In complete directed graph K4, each note has 3 outgoing + 3 incoming = 6 connections
      for (const node of graph.nodes) {
        assert.strictEqual(node.connections_count, 6);
        assert.strictEqual(node.is_orphan, false);
        assert.strictEqual(node.radius, 4 + 2 * 6); // 16
      }
      assert.strictEqual(graph.links.length, 12);
    }
  },
  {
    id: 'T2.29',
    name: 'Graph Drawer - Note with only unresolved dangling links generates phantom nodes',
    category: 'Graph Drawer Boundaries',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Speculative Note',
        content: 'Links to [[Unwritten Research]] and [[Unbuilt Engine]].'
      });

      const graph = await app.getGraphData();
      // Should contain 1 concrete node + 2 phantom nodes
      assert.strictEqual(graph.nodes.length, 3);
      const phantoms = graph.nodes.filter(n => n.is_unresolved);
      assert.strictEqual(phantoms.length, 2);
      assert.strictEqual(graph.links.length, 2);
      assert.ok(graph.links.every(l => l.is_unresolved));
    }
  },
  {
    id: 'T2.30',
    name: 'Graph Drawer - Hop-depth calculation on isolated orphan returns only itself',
    category: 'Graph Drawer Boundaries',
    async run() {
      const app = createAppInstance();
      const orphan = await app.createNote({ title: 'Solitary Island', content: 'No bridges' });
      await app.createNote({ title: 'Other Mainland', content: 'Far away' });

      const fullGraph = await app.getGraphData();
      const filtered1 = app.filterGraph(fullGraph, { centerNodeId: orphan.note.id, hopDepth: 1 });
      const filtered3 = app.filterGraph(fullGraph, { centerNodeId: orphan.note.id, hopDepth: 3 });

      assert.strictEqual(filtered1.nodes.length, 1);
      assert.strictEqual(filtered1.nodes[0].id, orphan.note.id);
      assert.strictEqual(filtered1.links.length, 0);

      assert.strictEqual(filtered3.nodes.length, 1);
      assert.strictEqual(filtered3.nodes[0].id, orphan.note.id);
    }
  }
];
