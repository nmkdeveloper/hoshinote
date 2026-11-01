/**
 * Tier 1: Feature Coverage Test Suite
 *
 * Covers primary behavior (happy paths) for all core features:
 * - Note CRUD Core (6 tests)
 * - Obsidian Wikilinks Engine (5 tests)
 * - FTS5 Full-Text Search (5 tests)
 * - Markdown GFM Rendering (5 tests)
 * - MathJax TeX Formula Rendering (5 tests)
 * - Interactive Graph Drawer (5 tests)
 * Total: 31 tests.
 */

import { assert } from '../utils/assert.js';
import { createAppInstance } from '../adapters/adapter_interface.js';

export const tier1Tests = [
  // ==========================================
  // Note CRUD (F-04)
  // ==========================================
  {
    id: 'T1.01',
    name: 'Note CRUD - Create note with title, content, path, and tags',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      const created = await app.createNote({
        title: 'Quantum Computing Foundations',
        content: 'Overview of qubits, superposition, and entanglement. #quantum #physics',
        path: '/science/physics',
        tags: ['computing']
      });

      assert.ok(created.note.id, 'Note ID must be generated');
      assert.strictEqual(created.note.title, 'Quantum Computing Foundations');
      assert.strictEqual(created.note.path, '/science/physics');
      assert.strictEqual(created.note.is_pinned, false);
      assert.strictEqual(created.note.is_archived, false);
      assert.ok(created.tags.includes('quantum'), 'Content tag #quantum should be extracted');
      assert.ok(created.tags.includes('physics'), 'Content tag #physics should be extracted');
      assert.ok(created.tags.includes('computing'), 'Explicit tag computing should be preserved');
    }
  },
  {
    id: 'T1.02',
    name: 'Note CRUD - Retrieve note by ID with full details and timestamps',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      const created = await app.createNote({
        title: 'Linear Algebra Review',
        content: 'Matrices and eigenvectors for machine learning.'
      });

      const fetched = await app.getNote(created.note.id);
      assert.strictEqual(fetched.note.id, created.note.id);
      assert.strictEqual(fetched.note.title, 'Linear Algebra Review');
      assert.ok(fetched.note.created_at, 'created_at timestamp must exist');
      assert.ok(fetched.note.updated_at, 'updated_at timestamp must exist');
      assert.strictEqual(Array.isArray(fetched.outgoing_links), true);
      assert.strictEqual(Array.isArray(fetched.incoming_links), true);
    }
  },
  {
    id: 'T1.03',
    name: 'Note CRUD - Retrieve note by title (case-insensitive lookup)',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Calculus Fundamentals',
        content: 'Limits and continuity.'
      });

      const exact = await app.getNoteByTitle('Calculus Fundamentals');
      assert.ok(exact, 'Should find note with exact title');
      assert.strictEqual(exact.note.title, 'Calculus Fundamentals');

      const lower = await app.getNoteByTitle('calculus fundamentals');
      assert.ok(lower, 'Should find note with lowercase title query');
      assert.strictEqual(lower.note.title, 'Calculus Fundamentals');

      const nonExistent = await app.getNoteByTitle('Astrophysics Unknown');
      assert.strictEqual(nonExistent, null, 'Should return null for non-existent note');
    }
  },
  {
    id: 'T1.04',
    name: 'Note CRUD - Update note title, content, path, and flags',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      const created = await app.createNote({
        title: 'Draft Spec',
        content: 'Initial thoughts.'
      });

      const updated = await app.updateNote(created.note.id, {
        title: 'Final Spec v1.0',
        content: 'Comprehensive specification. #spec #v1',
        is_pinned: true,
        is_archived: false
      });

      assert.strictEqual(updated.note.title, 'Final Spec v1.0');
      assert.strictEqual(updated.note.content, 'Comprehensive specification. #spec #v1');
      assert.strictEqual(updated.note.is_pinned, true);
      assert.ok(updated.tags.includes('spec'));
      assert.ok(updated.tags.includes('v1'));
    }
  },
  {
    id: 'T1.05',
    name: 'Note CRUD - Delete note removes from database and list queries',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      const note1 = await app.createNote({ title: 'Temporary Note', content: 'To be deleted' });
      const note2 = await app.createNote({ title: 'Permanent Note', content: 'Stays here' });

      await app.deleteNote(note1.note.id);

      assert.throws(() => {
        app.engine.getNote(note1.note.id);
      }, /not found/i, 'Deleted note should throw not found');

      const remaining = await app.listNotes();
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].title, 'Permanent Note');
    }
  },
  {
    id: 'T1.06',
    name: 'Note CRUD - List notes with tag filter, archive filter, and sorting',
    category: 'Note CRUD',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Alpha Note', content: '#alpha content', tags: ['alpha'] });
      await app.createNote({ title: 'Beta Note', content: '#beta content', tags: ['beta'] });
      const gamma = await app.createNote({ title: 'Gamma Note', content: '#alpha content' });
      await app.updateNote(gamma.note.id, { is_archived: true });

      const alphaActive = await app.listNotes({ tag: 'alpha', is_archived: false });
      assert.strictEqual(alphaActive.length, 1);
      assert.strictEqual(alphaActive[0].title, 'Alpha Note');

      const allArchived = await app.listNotes({ is_archived: true });
      assert.strictEqual(allArchived.length, 1);
      assert.strictEqual(allArchived[0].title, 'Gamma Note');
    }
  },

  // ==========================================
  // Obsidian Wikilinks Engine (F-05)
  // ==========================================
  {
    id: 'T1.07',
    name: 'Wikilinks - Parse simple wikilink [[Target Note]]',
    category: 'Wikilinks Engine',
    async run() {
      const app = createAppInstance();
      const parsed = app.parseWikilinks('Read more in [[Machine Learning Fundamentals]] for details.');
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].target_title, 'Machine Learning Fundamentals');
      assert.strictEqual(parsed[0].heading, null);
      assert.strictEqual(parsed[0].alias, null);
    }
  },
  {
    id: 'T1.08',
    name: 'Wikilinks - Parse aliased wikilink [[Target Note|Custom Alias]]',
    category: 'Wikilinks Engine',
    async run() {
      const app = createAppInstance();
      const parsed = app.parseWikilinks('Refer to [[Deep Learning Architecture|CNN Guide]] in chapter 3.');
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].target_title, 'Deep Learning Architecture');
      assert.strictEqual(parsed[0].alias, 'CNN Guide');
      assert.strictEqual(parsed[0].heading, null);
    }
  },
  {
    id: 'T1.09',
    name: 'Wikilinks - Parse heading anchor wikilink [[Target Note#Section Title]]',
    category: 'Wikilinks Engine',
    async run() {
      const app = createAppInstance();
      const parsed = app.parseWikilinks('See [[Calculus#Chain Rule]] for the mathematical proof.');
      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].target_title, 'Calculus');
      assert.strictEqual(parsed[0].heading, 'Chain Rule');
      assert.strictEqual(parsed[0].alias, null);
    }
  },
  {
    id: 'T1.10',
    name: 'Wikilinks - Mark link as dangling/unresolved when target note does not exist',
    category: 'Wikilinks Engine',
    async run() {
      const app = createAppInstance();
      const note = await app.createNote({
        title: 'Project Roadmap',
        content: 'Next phase will tackle [[Distributed Consensus Protocol]].'
      });

      assert.strictEqual(note.outgoing_links.length, 1);
      assert.strictEqual(note.outgoing_links[0].target_title, 'Distributed Consensus Protocol');
      assert.strictEqual(note.outgoing_links[0].is_unresolved, true);
      assert.strictEqual(note.outgoing_links[0].target_id, null);
    }
  },
  {
    id: 'T1.11',
    name: 'Wikilinks - Query backlinks to retrieve notes linking to target note',
    category: 'Wikilinks Engine',
    async run() {
      const app = createAppInstance();
      const target = await app.createNote({
        title: 'Special Relativity',
        content: 'Lorentz transformations and spacetime intervals.'
      });

      await app.createNote({
        title: 'Electrodynamics',
        content: 'Maxwell equations are covariant under [[Special Relativity]].'
      });

      await app.createNote({
        title: 'Cosmology Notes',
        content: 'Hubble expansion assumes [[Special Relativity]] locally.'
      });

      const backlinks = await app.getBacklinks(target.note.id);
      assert.strictEqual(backlinks.length, 2);
      const sourceTitles = backlinks.map(b => b.source_title);
      assert.ok(sourceTitles.includes('Electrodynamics'));
      assert.ok(sourceTitles.includes('Cosmology Notes'));
    }
  },

  // ==========================================
  // FTS5 Full-Text Search (F-06)
  // ==========================================
  {
    id: 'T1.12',
    name: 'Search - Find notes matching title query',
    category: 'FTS5 Search',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Differential Geometry', content: 'Curvature and tensors.' });
      await app.createNote({ title: 'Algebraic Topology', content: 'Homology and fundamental groups.' });

      const results = await app.searchNotes('Differential');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Differential Geometry');
      assert.isAbove(results[0].rank, 0);
    }
  },
  {
    id: 'T1.13',
    name: 'Search - Match note content and extract surrounding context snippet',
    category: 'FTS5 Search',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Algorithm Design',
        content: 'We use the dynamic programming paradigm to compute the shortest path efficiently.'
      });

      const results = await app.searchNotes('dynamic programming');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Algorithm Design');
      assert.ok(results[0].snippet.toLowerCase().includes('dynamic programming'));
    }
  },
  {
    id: 'T1.14',
    name: 'Search - Multi-term search requires query keywords',
    category: 'FTS5 Search',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Rust Systems', content: 'Memory safety without garbage collection.' });
      await app.createNote({ title: 'Go Systems', content: 'Concurrency using goroutines.' });

      const results = await app.searchNotes('memory garbage');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Rust Systems');
    }
  },
  {
    id: 'T1.15',
    name: 'Search - Case-insensitive matching across titles and bodies',
    category: 'FTS5 Search',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'NEURAL NETWORKS', content: 'Backpropagation and SGD.' });

      const lower = await app.searchNotes('neural networks');
      assert.strictEqual(lower.length, 1);

      const upper = await app.searchNotes('BACKPROPAGATION');
      assert.strictEqual(upper.length, 1);
    }
  },
  {
    id: 'T1.16',
    name: 'Search - Relevance ranking ranks title matches above content-only matches',
    category: 'FTS5 Search',
    async run() {
      const app = createAppInstance();
      // Note A matches in title
      await app.createNote({ title: 'Database Optimization Guide', content: 'General concepts.' });
      // Note B matches only in body
      await app.createNote({ title: 'Storage Engines', content: 'Covers database optimization techniques.' });

      const results = await app.searchNotes('Database Optimization');
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].title, 'Database Optimization Guide');
      assert.isAbove(results[0].rank, results[1].rank);
    }
  },

  // ==========================================
  // Markdown GFM Rendering (F-07)
  // ==========================================
  {
    id: 'T1.17',
    name: 'Markdown - Render GFM headings h1 through h6',
    category: 'Markdown GFM',
    async run() {
      const app = createAppInstance();
      const md = '# Title\n## Subtitle\n### Section\n#### Sub\n##### Deep\n###### Leaf';
      const html = app.renderMarkdown(md);
      assert.ok(html.includes('<h1>Title</h1>'));
      assert.ok(html.includes('<h2>Subtitle</h2>'));
      assert.ok(html.includes('<h3>Section</h3>'));
      assert.ok(html.includes('<h4>Sub</h4>'));
      assert.ok(html.includes('<h5>Deep</h5>'));
      assert.ok(html.includes('<h6>Leaf</h6>'));
    }
  },
  {
    id: 'T1.18',
    name: 'Markdown - Render bullet lists, ordered lists, and blockquotes',
    category: 'Markdown GFM',
    async run() {
      const app = createAppInstance();
      const md = '- Item 1\n- Item 2\n\n> Important note quote';
      const html = app.renderMarkdown(md);
      assert.ok(html.includes('<li>Item 1</li>'));
      assert.ok(html.includes('<li>Item 2</li>'));
      assert.ok(html.includes('<blockquote><p>Important note quote</p></blockquote>'));
    }
  },
  {
    id: 'T1.19',
    name: 'Markdown - Render GFM task lists with checkbox states',
    category: 'Markdown GFM',
    async run() {
      const app = createAppInstance();
      const md = '- [ ] Pending task\n- [x] Completed task';
      const html = app.renderMarkdown(md);
      assert.ok(html.includes('<li class="task-list-item"><input type="checkbox" disabled /> Pending task</li>'));
      assert.ok(html.includes('<li class="task-list-item"><input type="checkbox" checked disabled /> Completed task</li>'));
    }
  },
  {
    id: 'T1.20',
    name: 'Markdown - Render GFM tables with headers and cell alignment',
    category: 'Markdown GFM',
    async run() {
      const app = createAppInstance();
      const md = '| Syntax | Description |\n| --- | --- |\n| Header | Title |\n| Paragraph | Text |';
      const html = app.renderMarkdown(md);
      assert.ok(html.includes('<table><thead><tr><th>Syntax</th><th>Description</th></tr></thead>'));
      assert.ok(html.includes('<tr><td>Header</td><td>Title</td></tr>'));
      assert.ok(html.includes('<tr><td>Paragraph</td><td>Text</td></tr>'));
    }
  },
  {
    id: 'T1.21',
    name: 'Markdown - Render syntax highlighted code blocks with language tag',
    category: 'Markdown GFM',
    async run() {
      const app = createAppInstance();
      const md = '```rust\nfn main() {\n    println!("Hello, Hoshinote!");\n}\n```';
      const html = app.renderMarkdown(md);
      assert.ok(html.includes('<pre><code class="language-rust">'));
      assert.ok(html.includes('println!(&quot;Hello, Hoshinote!&quot;);'));
    }
  },

  // ==========================================
  // MathJax TeX Formula Rendering (F-08)
  // ==========================================
  {
    id: 'T1.22',
    name: 'MathJax - Render inline math expression $E = mc^2$ to SVG',
    category: 'MathJax Rendering',
    async run() {
      const app = createAppInstance();
      const svg = app.renderMath('E = mc^2', false);
      assert.ok(svg.includes('<svg class="math-inline"'));
      assert.ok(svg.includes('role="img"'));
      assert.ok(svg.includes('E = mc^2'));
    }
  },
  {
    id: 'T1.23',
    name: 'MathJax - Render display block math $$\\int_{a}^{b} f(x) dx$$ to display container',
    category: 'MathJax Rendering',
    async run() {
      const app = createAppInstance();
      const html = app.renderMath('\\int_{a}^{b} f(x) dx', true);
      assert.ok(html.includes('<div class="math-display">'));
      assert.ok(html.includes('<svg class="math-block"'));
      assert.ok(html.includes('\\int_{a}^{b} f(x) dx'));
    }
  },
  {
    id: 'T1.24',
    name: 'MathJax - Render Greek symbols, matrices, and fractions',
    category: 'MathJax Rendering',
    async run() {
      const app = createAppInstance();
      const latex = '\\frac{\\alpha + \\beta}{\\sqrt{\\gamma}}';
      const svg = app.renderMath(latex, false);
      assert.ok(svg.includes('<svg class="math-inline"'));
      assert.ok(svg.includes('\\frac{\\alpha + \\beta}{\\sqrt{\\gamma}}'));
    }
  },
  {
    id: 'T1.25',
    name: 'MathJax - Render multiple inline math formulas in a single paragraph',
    category: 'MathJax Rendering',
    async run() {
      const app = createAppInstance();
      const content = 'Let $x = 5$ and $y = 10$, then $x + y = 15$ holds.';
      const rendered = app.parseMarkdownWithMath(content);
      const matches = rendered.match(/<svg class="math-inline"/g);
      assert.strictEqual(matches.length, 3, 'Should render exactly 3 inline math SVGs');
    }
  },
  {
    id: 'T1.26',
    name: 'MathJax - Unified AST integrates formatted Markdown and TeX SVG',
    category: 'MathJax Rendering',
    async run() {
      const app = createAppInstance();
      const content = '## Einstein Energy Equation\n**Notice**: The famous formula is $E = mc^2$.\n$$\\Delta E = \\Delta m \\cdot c^2$$';
      const rendered = app.parseMarkdownWithMath(content);
      assert.ok(rendered.includes('<h2>Einstein Energy Equation</h2>'));
      assert.ok(rendered.includes('<strong>Notice</strong>: The famous formula is <svg class="math-inline"'));
      assert.ok(rendered.includes('<div class="math-display"><svg class="math-block"'));
    }
  },

  // ==========================================
  // Interactive Graph Drawer & Filters (F-10 / F-11)
  // ==========================================
  {
    id: 'T1.27',
    name: 'Graph Drawer - Extract graph nodes and edges from vault notes and wikilinks',
    category: 'Graph Drawer',
    async run() {
      const app = createAppInstance();
      const n1 = await app.createNote({ title: 'Graph Theory', content: 'Studies [[Eulerian Path]].' });
      const n2 = await app.createNote({ title: 'Eulerian Path', content: 'A trail in a finite graph.' });

      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 2);
      assert.strictEqual(graph.links.length, 1);
      assert.strictEqual(graph.links[0].source, n1.note.id);
      assert.strictEqual(graph.links[0].target, n2.note.id);
      assert.strictEqual(graph.links[0].is_unresolved, false);
    }
  },
  {
    id: 'T1.28',
    name: 'Graph Drawer - Calculate dynamic node radius based on connections count',
    category: 'Graph Drawer',
    async run() {
      const app = createAppInstance();
      const hub = await app.createNote({ title: 'Hub Note', content: 'Central repository.' });
      await app.createNote({ title: 'Satellite 1', content: 'Links to [[Hub Note]].' });
      await app.createNote({ title: 'Satellite 2', content: 'Links to [[Hub Note]].' });
      await app.createNote({ title: 'Satellite 3', content: 'Links to [[Hub Note]].' });

      const graph = await app.getGraphData();
      const hubNode = graph.nodes.find(n => n.id === hub.note.id);
      const sat1Node = graph.nodes.find(n => n.title === 'Satellite 1');

      assert.strictEqual(hubNode.connections_count, 3);
      assert.strictEqual(sat1Node.connections_count, 1);
      assert.isAbove(hubNode.radius, sat1Node.radius, 'Hub note radius must exceed satellite radius');
      assert.strictEqual(hubNode.radius, 4 + 2 * 3); // 10
    }
  },
  {
    id: 'T1.29',
    name: 'Graph Drawer - Detect and flag orphan notes (0 connections)',
    category: 'Graph Drawer',
    async run() {
      const app = createAppInstance();
      const orphan = await app.createNote({ title: 'Isolated Thought', content: 'No links anywhere.' });
      await app.createNote({ title: 'A', content: 'Links to [[B]].' });
      await app.createNote({ title: 'B', content: 'Target' });

      const graph = await app.getGraphData();
      const orphanNode = graph.nodes.find(n => n.id === orphan.note.id);
      assert.strictEqual(orphanNode.is_orphan, true);
      assert.strictEqual(orphanNode.connections_count, 0);

      const filtered = app.filterGraph(graph, { hideOrphans: true });
      const orphanFound = filtered.nodes.some(n => n.id === orphan.note.id);
      assert.strictEqual(orphanFound, false, 'Hide orphans must filter out orphan nodes');
    }
  },
  {
    id: 'T1.30',
    name: 'Graph Drawer - Assign Catppuccin color groups based on primary note tag',
    category: 'Graph Drawer',
    async run() {
      const app = createAppInstance();
      await app.createNote({ title: 'Calculus', content: '#math analysis' });
      await app.createNote({ title: 'Quantum Mechanics', content: '#physics wavefunctions' });
      await app.createNote({ title: 'Random Scribble', content: 'No tag here' });

      const graph = await app.getGraphData();
      const mathNode = graph.nodes.find(n => n.title === 'Calculus');
      const physicsNode = graph.nodes.find(n => n.title === 'Quantum Mechanics');
      const untaggedNode = graph.nodes.find(n => n.title === 'Random Scribble');

      assert.strictEqual(mathNode.group, 'math');
      assert.strictEqual(physicsNode.group, 'physics');
      assert.strictEqual(untaggedNode.group, 'general');
    }
  },
  {
    id: 'T1.31',
    name: 'Graph Drawer - Hop-depth neighborhood filtering (1-hop vs 2-hop)',
    category: 'Graph Drawer',
    async run() {
      const app = createAppInstance();
      // Chain: A -> B -> C -> D
      const a = await app.createNote({ title: 'Node A', content: 'Links to [[Node B]].' });
      const b = await app.createNote({ title: 'Node B', content: 'Links to [[Node C]].' });
      const c = await app.createNote({ title: 'Node C', content: 'Links to [[Node D]].' });
      const d = await app.createNote({ title: 'Node D', content: 'End of chain.' });

      const fullGraph = await app.getGraphData();

      // 1-hop from Node B: should include A, B, C (distance <= 1)
      const hop1 = app.filterGraph(fullGraph, { centerNodeId: b.note.id, hopDepth: 1 });
      const hop1Ids = new Set(hop1.nodes.map(n => n.id));
      assert.ok(hop1Ids.has(a.note.id), '1-hop should include neighbor Node A');
      assert.ok(hop1Ids.has(b.note.id), '1-hop should include center Node B');
      assert.ok(hop1Ids.has(c.note.id), '1-hop should include neighbor Node C');
      assert.strictEqual(hop1Ids.has(d.note.id), false, '1-hop should NOT include Node D');

      // 2-hop from Node A: should include A, B, C (distance <= 2)
      const hop2 = app.filterGraph(fullGraph, { centerNodeId: a.note.id, hopDepth: 2 });
      const hop2Ids = new Set(hop2.nodes.map(n => n.id));
      assert.ok(hop2Ids.has(c.note.id), '2-hop should include Node C');
      assert.strictEqual(hop2Ids.has(d.note.id), false, '2-hop from A should NOT reach Node D');
    }
  }
];
