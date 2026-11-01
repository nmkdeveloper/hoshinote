/**
 * Tier 3: Cross-Feature Combinations Test Suite
 *
 * Covers pairwise and multi-feature interaction contracts:
 * - MathJax + Wikilinks (T3.01)
 * - FTS5 Search + MathJax LaTeX (T3.02)
 * - Note Renaming + Backlinks + Graph (T3.03)
 * - Note Deletion + Dangling Links + Graph (T3.04)
 * - Markdown Tables/Tasklists + Wikilinks (T3.05)
 * - Search + Tag Filtering (T3.06)
 * - Graph Tag Filter + Hop Depth (T3.07)
 * - Pinned/Archived Flags + Search & List (T3.08)
 * - Mixed Currency + MathJax Rendering (T3.09)
 * - Batch Interlinking + Graph Topology (T3.10)
 * - Tag Aggregation Lifecycle (T3.11)
 * - Search on Wikilink Aliases & Headings (T3.12)
 * Total: 12 tests.
 */

import { assert } from '../utils/assert.js';
import { createAppInstance } from '../adapters/adapter_interface.js';

export const tier3Tests = [
  {
    id: 'T3.01',
    name: 'Combination - MathJax formulas embedded in wikilinked note are preserved in rendering',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const mathNote = await app.createNote({
        title: 'Euler Identity',
        content: '# Euler Formula\nThe fundamental relation is $e^{i\\pi} + 1 = 0$.\n$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$$'
      });

      const callerNote = await app.createNote({
        title: 'Complex Analysis',
        content: 'Check the proof in [[Euler Identity]].'
      });

      // Verify link resolution
      assert.strictEqual(callerNote.outgoing_links[0].target_id, mathNote.note.id);

      // Verify target note math rendering
      const rendered = app.parseMarkdownWithMath(mathNote.note.content);
      assert.ok(rendered.includes('<svg class="math-inline"'));
      assert.ok(rendered.includes('<div class="math-display"><svg class="math-block"'));
    }
  },
  {
    id: 'T3.02',
    name: 'Combination - FTS search finds notes by LaTeX formula tokens embedded in Markdown',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Thermodynamics Partition Function',
        content: 'The canonical partition function is $$Z = \\sum_i e^{-\\beta E_i}$$ where $\\beta = \\frac{1}{k_B T}$.'
      });

      const searchResults = await app.searchNotes('\\beta');
      assert.strictEqual(searchResults.length, 1);
      assert.strictEqual(searchResults[0].title, 'Thermodynamics Partition Function');
      assert.ok(searchResults[0].snippet.includes('\\beta'));
    }
  },
  {
    id: 'T3.03',
    name: 'Combination - Renaming note updates incoming backlinks and maintains graph topology',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const target = await app.createNote({
        title: 'Draft Protocol',
        content: 'Initial specification.'
      });

      const source = await app.createNote({
        title: 'Client App',
        content: 'Implements [[Draft Protocol]].'
      });

      // Verify initial backlink
      let backlinks = await app.getBacklinks(target.note.id);
      assert.strictEqual(backlinks.length, 1);
      assert.strictEqual(backlinks[0].source_title, 'Client App');

      // Rename target note
      await app.updateNote(target.note.id, { title: 'Final RFC 101' });

      // Backlinks should still resolve properly
      backlinks = await app.getBacklinks(target.note.id);
      assert.strictEqual(backlinks.length, 1);

      // Graph links should reflect resolved connection
      const graph = await app.getGraphData();
      const link = graph.links.find(l => l.source === source.note.id);
      assert.strictEqual(link.target, target.note.id);
      assert.strictEqual(link.is_unresolved, false);
    }
  },
  {
    id: 'T3.04',
    name: 'Combination - Deleting a target note converts incoming links to dangling and updates graph',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const target = await app.createNote({ title: 'Deprecated Module', content: 'Legacy.' });
      const caller = await app.createNote({
        title: 'Integration Service',
        content: 'Depends on [[Deprecated Module]].'
      });

      // Initial graph: 2 notes, 1 resolved link
      let graph = await app.getGraphData();
      assert.strictEqual(graph.links[0].is_unresolved, false);

      // Delete target
      await app.deleteNote(target.note.id);

      // Caller note link should now be dangling
      const callerFetched = await app.getNote(caller.note.id);
      assert.strictEqual(callerFetched.outgoing_links[0].is_unresolved, true);
      assert.strictEqual(callerFetched.outgoing_links[0].target_id, null);

      // Graph should now have phantom node for unresolved target
      graph = await app.getGraphData();
      const danglingEdge = graph.links.find(l => l.source === caller.note.id);
      assert.strictEqual(danglingEdge.is_unresolved, true);
      assert.ok(danglingEdge.target.startsWith('unresolved:'));
    }
  },
  {
    id: 'T3.05',
    name: 'Combination - Wikilinks inside GFM table cells and task lists are parsed into AST and HTML',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const content = `
| Task Name | Assignee | Reference |
| --- | --- | --- |
| Fix Auth | Alice | [[Auth Module Spec]] |
| Run Bench | Bob | [[Performance Guide|Benchmarks]] |

- [ ] Complete [[Security Audit]]
- [x] Review [[Auth Module Spec]]
      `.trim();

      const parsedLinks = app.parseWikilinks(content);
      assert.strictEqual(parsedLinks.length, 4);

      const html = app.renderMarkdown(content);
      assert.ok(html.includes('<a class="wikilink" data-target="Auth Module Spec"'));
      assert.ok(html.includes('<a class="wikilink" data-target="Performance Guide"'));
      assert.ok(html.includes('Benchmarks</a>'));
      assert.ok(html.includes('<input type="checkbox" checked disabled /> Review <a class="wikilink"'));
    }
  },
  {
    id: 'T3.06',
    name: 'Combination - Search query combined with tag filtering',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Database Schema',
        content: 'PostgreSQL relational tables and indexes. #database'
      });
      await app.createNote({
        title: 'Cache Architecture',
        content: 'Redis memory store and caching layers. #backend'
      });

      // Search matching both content token and tag
      const dbResults = await app.searchNotes('database');
      assert.strictEqual(dbResults.length, 1);
      assert.strictEqual(dbResults[0].title, 'Database Schema');

      const backendResults = await app.searchNotes('#backend');
      assert.strictEqual(backendResults.length, 1);
      assert.strictEqual(backendResults[0].title, 'Cache Architecture');
    }
  },
  {
    id: 'T3.07',
    name: 'Combination - Graph tag filtering combined with hop-depth local neighborhood calculation',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      // Topology: MathHub (#math) -> AlgA (#math) -> AlgB (#cs)
      const mathHub = await app.createNote({
        title: 'Math Hub',
        content: 'Links to [[Algorithm A]]. #math'
      });
      const algA = await app.createNote({
        title: 'Algorithm A',
        content: 'Links to [[Algorithm B]]. #math'
      });
      const algB = await app.createNote({
        title: 'Algorithm B',
        content: 'Terminal node. #cs'
      });

      const graph = await app.getGraphData();

      // Filter by tag 'math': should only retain Math Hub and Algorithm A
      const tagFiltered = app.filterGraph(graph, { tag: 'math' });
      assert.strictEqual(tagFiltered.nodes.length, 2);
      assert.strictEqual(tagFiltered.links.length, 1);

      // Hop-depth 1 from mathHub within tag-filtered graph: only mathHub and AlgA
      const hopCombined = app.filterGraph(tagFiltered, { centerNodeId: mathHub.note.id, hopDepth: 1 });
      assert.strictEqual(hopCombined.nodes.length, 2);
      const ids = hopCombined.nodes.map(n => n.id);
      assert.ok(ids.includes(mathHub.note.id));
      assert.ok(ids.includes(algA.note.id));
      assert.strictEqual(ids.includes(algB.note.id), false);
    }
  },
  {
    id: 'T3.08',
    name: 'Combination - Pinned and archived flags interaction with listing and search',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const n1 = await app.createNote({ title: 'Important Pinned', content: 'Keyword target.' });
      await app.updateNote(n1.note.id, { is_pinned: true });

      const n2 = await app.createNote({ title: 'Archived Reference', content: 'Keyword target.' });
      await app.updateNote(n2.note.id, { is_archived: true });

      // Active notes list should omit archived
      const activeList = await app.listNotes({ is_archived: false });
      assert.strictEqual(activeList.length, 1);
      assert.strictEqual(activeList[0].title, 'Important Pinned');
      assert.strictEqual(activeList[0].is_pinned, true);

      // Search matches all notes including archived
      const searchRes = await app.searchNotes('Keyword target');
      assert.strictEqual(searchRes.length, 2);
    }
  },
  {
    id: 'T3.09',
    name: 'Combination - Mixed currency symbols and math expressions in a single document',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const content = 'The equipment cost $1500 and license was $200. Total formula: $C_{total} = C_{equip} + C_{lic} = \\$1700$.';
      const rendered = app.parseMarkdownWithMath(content);

      // Currency $1500 and $200 preserved as text
      assert.ok(rendered.includes('$1500'));
      assert.ok(rendered.includes('$200'));

      // Math expression rendered as SVG
      assert.ok(rendered.includes('<svg class="math-inline"'));
      assert.ok(rendered.includes('C_{total}'));
    }
  },
  {
    id: 'T3.10',
    name: 'Combination - Cascading graph updates during batch note creation and mutual linking',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const createdNotes = [];

      for (let i = 1; i <= 5; i++) {
        createdNotes.push(await app.createNote({
          title: `Service Node ${i}`,
          content: `Initial #system`
        }));
      }

      // Mutual links: each node i links to node (i % 5) + 1
      for (let i = 0; i < 5; i++) {
        const nextIdx = (i + 1) % 5;
        const targetTitle = createdNotes[nextIdx].note.title;
        await app.updateNote(createdNotes[i].note.id, {
          content: `Calls [[${targetTitle}]] regularly. #system`
        });
      }

      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 5);
      assert.strictEqual(graph.links.length, 5);
      // Ring topology: every node has 1 incoming + 1 outgoing = 2 connections
      for (const node of graph.nodes) {
        assert.strictEqual(node.connections_count, 2);
        assert.strictEqual(node.is_orphan, false);
        assert.strictEqual(node.radius, 4 + 2 * 2); // 8
        assert.strictEqual(node.group, 'system');
      }
    }
  },
  {
    id: 'T3.11',
    name: 'Combination - Tag summary aggregation lifecycle (creation, update, deletion)',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      const n1 = await app.createNote({ title: 'A', content: '#alpha #beta' });
      const n2 = await app.createNote({ title: 'B', content: '#alpha #gamma' });

      let tags = await app.getAllTags();
      const alphaTag = tags.find(t => t.name === 'alpha');
      assert.strictEqual(alphaTag.count, 2);

      // Update n1 to remove #beta and add #gamma
      await app.updateNote(n1.note.id, { content: '#alpha #gamma' });
      tags = await app.getAllTags();
      const betaTag = tags.find(t => t.name === 'beta');
      assert.strictEqual(betaTag, undefined, 'Tag beta with 0 count should be purged');

      const gammaTag = tags.find(t => t.name === 'gamma');
      assert.strictEqual(gammaTag.count, 2);

      // Delete n2
      await app.deleteNote(n2.note.id);
      tags = await app.getAllTags();
      assert.strictEqual(tags.find(t => t.name === 'alpha').count, 1);
    }
  },
  {
    id: 'T3.12',
    name: 'Combination - Search query matches wikilink alias text and heading anchors',
    category: 'Cross-Feature Combinations',
    async run() {
      const app = createAppInstance();
      await app.createNote({
        title: 'Knowledge Index',
        content: 'Check the analysis in [[Quantum Mechanics#Superposition Principle|Schrodinger Cat Paradox]].'
      });

      const resAlias = await app.searchNotes('Schrodinger Cat Paradox');
      assert.strictEqual(resAlias.length, 1);
      assert.strictEqual(resAlias[0].title, 'Knowledge Index');

      const resHeading = await app.searchNotes('Superposition Principle');
      assert.strictEqual(resHeading.length, 1);
      assert.strictEqual(resHeading[0].title, 'Knowledge Index');
    }
  }
];
