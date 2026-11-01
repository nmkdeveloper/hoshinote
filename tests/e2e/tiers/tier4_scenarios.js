/**
 * Tier 4: Real-World Application Scenarios Test Suite
 *
 * Simulates end-to-end user workflows and complex multi-note environments:
 * - T4.01: STEM Student Math & Physics Lecture Series
 * - T4.02: Academic Research Paper Cross-Referencing Vault
 * - T4.03: Software Engineering Architecture Documentation
 * - T4.04: Zettelkasten Slip-Box Knowledge Network
 * - T4.05: Full Lifecycle Vault Stress and Invariant Consistency
 * Total: 5 scenarios.
 */

import { assert } from '../utils/assert.js';
import { createAppInstance } from '../adapters/adapter_interface.js';

export const tier4Tests = [
  {
    id: 'T4.01',
    name: 'Scenario - STEM Student Math & Physics Lecture Series Workload',
    category: 'Real-World Scenarios',
    async run() {
      const app = createAppInstance();

      // 1. Lecture: Calculus I - Limits
      const limits = await app.createNote({
        title: 'Calculus I - Limits and Continuity',
        content: `
# Limits & Continuity #math #calculus

The fundamental limit identity:
$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$

Continuity requires: $\\lim_{x \\to a} f(x) = f(a)$.
Essential foundation for [[Calculus I - Derivatives]].
        `.trim()
      });

      // 2. Lecture: Calculus I - Derivatives
      const derivatives = await app.createNote({
        title: 'Calculus I - Derivatives',
        content: `
# Derivatives and Rates of Change #math #calculus

Built upon [[Calculus I - Limits and Continuity]].
The derivative definition:
$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

Power rule: $\\frac{d}{dx} x^n = n x^{n-1}$.
Used directly in [[Physics - Classical Mechanics]].
        `.trim()
      });

      // 3. Lecture: Calculus I - Integrals
      const integrals = await app.createNote({
        title: 'Calculus I - Integrals',
        content: `
# Definite and Indefinite Integrals #math #calculus

The Fundamental Theorem of Calculus:
$$\\int_{a}^{b} f(x) dx = F(b) - F(a)$$

Inverse operation of [[Calculus I - Derivatives]].
        `.trim()
      });

      // 4. Lecture: Physics - Classical Mechanics
      const physics = await app.createNote({
        title: 'Physics - Classical Mechanics',
        content: `
# Classical Mechanics & Kinematics #physics #mechanics

Newton's Second Law expressed as differential equation:
$$\\vec{F} = m \\vec{a} = m \\frac{d^2 \\vec{x}}{dt^2}$$

Requires derivative concepts from [[Calculus I - Derivatives]] and integration from [[Calculus I - Integrals]].
        `.trim()
      });

      // Verification A: TeX SVG rendering in all notes
      const renderedLimits = app.parseMarkdownWithMath(limits.note.content);
      assert.ok(renderedLimits.includes('\\lim_{x \\to 0}'));
      assert.ok(renderedLimits.includes('Continuity requires'));

      const renderedPhysics = app.parseMarkdownWithMath(physics.note.content);
      assert.ok(renderedPhysics.includes('\\vec{F} = m \\vec{a}'));

      // Verification B: Full text search across mathematical formulas
      const searchFTC = await app.searchNotes('Fundamental Theorem');
      assert.strictEqual(searchFTC.length, 1);
      assert.strictEqual(searchFTC[0].title, 'Calculus I - Integrals');

      const searchDerivToken = await app.searchNotes('\\frac{d}{dx}');
      assert.strictEqual(searchDerivToken.length, 1);
      assert.strictEqual(searchDerivToken[0].title, 'Calculus I - Derivatives');

      // Verification C: Graph Drawer and Tag Grouping
      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 4);

      const mathNodes = graph.nodes.filter(n => n.group === 'math');
      const physicsNodes = graph.nodes.filter(n => n.group === 'physics');
      assert.strictEqual(mathNodes.length, 3);
      assert.strictEqual(physicsNodes.length, 1);

      // Derivatives is the primary hub (linked by Limits, Integrals, and Physics)
      const derivNode = graph.nodes.find(n => n.id === derivatives.note.id);
      assert.isAtLeast(derivNode.connections_count, 3);
    }
  },

  {
    id: 'T4.02',
    name: 'Scenario - Academic Research Paper Cross-Referencing Vault',
    category: 'Real-World Scenarios',
    async run() {
      const app = createAppInstance();

      // 1. Foundational Paper
      const vaswani = await app.createNote({
        title: 'Attention Is All You Need',
        content: `
# Attention Is All You Need #paper #ai
Authors: Vaswani et al. (2017).
Introduced the multi-head self-attention mechanism:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
        `.trim()
      });

      // 2. Applied Paper 1 (BERT)
      const bert = await app.createNote({
        title: 'BERT Pre-training',
        content: `
# BERT: Pre-training of Deep Bidirectional Transformers #paper #ai
Uses Transformer encoder stacks from [[Attention Is All You Need|Vaswani et al. (2017)]].
Masked language modeling objective.
        `.trim()
      });

      // 3. Applied Paper 2 (GPT)
      const gpt = await app.createNote({
        title: 'Language Models are Few-Shot Learners',
        content: `
# GPT-3 Architecture #paper #ai
Autoregressive Transformer decoder based on [[Attention Is All You Need]].
Scales parameters up to 175B.
        `.trim()
      });

      // 4. Applied Paper 3 (Transformer-XL)
      await app.createNote({
        title: 'Transformer-XL Recurrence',
        content: `
# Transformer-XL #paper #ai
Extends the multi-head attention in [[Attention Is All You Need|Vaswani et al. (2017)]] with segment-level recurrence.
        `.trim()
      });

      // 5. Survey Paper
      const survey = await app.createNote({
        title: 'LLM Survey 2026',
        content: `
# Survey of Modern Large Language Models #paper #survey
Comprehensive survey reviewing:
- Foundational Transformer: [[Attention Is All You Need|Original 2017 Paper]]
- Bidirectional encoders: [[BERT Pre-training|BERT]]
- Autoregressive decoders: [[Language Models are Few-Shot Learners|GPT-3]]
        `.trim()
      });

      // Verification A: Backlink density analysis
      const vaswaniBacklinks = await app.getBacklinks(vaswani.note.id);
      assert.strictEqual(vaswaniBacklinks.length, 4, 'Foundational paper must have 4 incoming citations');

      // Verification B: Dynamic radius in graph
      const graph = await app.getGraphData();
      const vaswaniNode = graph.nodes.find(n => n.id === vaswani.note.id);
      const surveyNode = graph.nodes.find(n => n.id === survey.note.id);

      assert.isAbove(vaswaniNode.radius, surveyNode.radius, 'Foundational citation hub must have larger radius than leaf survey');

      // Verification C: Aliased link rendering
      const surveyHtml = app.renderMarkdown(survey.note.content);
      assert.ok(surveyHtml.includes('<a class="wikilink" data-target="Attention Is All You Need"'));
      assert.ok(surveyHtml.includes('Original 2017 Paper</a>'));
    }
  },

  {
    id: 'T4.03',
    name: 'Scenario - Software Engineering Architecture Documentation Vault',
    category: 'Real-World Scenarios',
    async run() {
      const app = createAppInstance();

      // System Overview
      const overview = await app.createNote({
        title: 'System Architecture Overview',
        content: `
# Hoshinote Core Architecture #system #docs

Microservices and Subsystems:
- Authentication & Sessions: [[Auth Service]]
- Note & Database Engine: [[Database Cluster]]
- Real-time Graph Visualizer: [[Graph Service]]

Unlinked upcoming feature: [[Draft Payment RFC]].
        `.trim()
      });

      // Auth Service
      await app.createNote({
        title: 'Auth Service',
        content: `
# Auth Service Specification #backend
| Route | Method | Description |
| --- | --- | --- |
| /api/login | POST | User JWT issue |
| /api/verify | GET | Token validation |

- [x] JWT verification implemented
- [ ] OAuth2 Google integration
Persists sessions to [[Database Cluster]].
        `.trim()
      });

      // Database Cluster
      const db = await app.createNote({
        title: 'Database Cluster',
        content: `
# SQLite Database & FTS5 #database #storage
Bundled SQLite engine configured with:
- WAL mode enabled
- Foreign keys ON
- FTS5 unicode61 tokenizer
        `.trim()
      });

      // Graph Service
      await app.createNote({
        title: 'Graph Service',
        content: `
# Graph Rendering Engine #frontend
Uses react-force-graph-2d with HTML5 Canvas.
Queries node topologies from [[Database Cluster]].
        `.trim()
      });

      // Isolated Draft RFC (orphan)
      const orphanDraft = await app.createNote({
        title: 'Draft Payment RFC',
        content: '# Draft RFC for Stripe Integration #draft\nWork in progress.'
      });

      // Verification A: GFM Table and Task list rendering in Auth Service
      const authNote = await app.getNoteByTitle('Auth Service');
      const renderedAuth = app.renderMarkdown(authNote.note.content);
      assert.ok(renderedAuth.includes('<table><thead><tr><th>Route</th><th>Method</th><th>Description</th></tr></thead>'));
      assert.ok(renderedAuth.includes('<input type="checkbox" checked disabled /> JWT verification implemented'));
      assert.ok(renderedAuth.includes('<input type="checkbox" disabled /> OAuth2 Google integration'));

      // Verification B: Orphan detection
      const graph = await app.getGraphData();
      const draftNode = graph.nodes.find(n => n.id === orphanDraft.note.id);
      // Wait: draftNode was linked in System Architecture Overview! So draftNode is NOT an orphan (it has incoming link).
      assert.strictEqual(draftNode.connections_count, 1);
      assert.strictEqual(draftNode.is_orphan, false);

      // Now create a truly isolated note
      const solitary = await app.createNote({ title: 'Unlinked Scratchpad', content: 'Just notes' });
      const updatedGraph = await app.getGraphData();
      const solitaryNode = updatedGraph.nodes.find(n => n.id === solitary.note.id);
      assert.strictEqual(solitaryNode.is_orphan, true);

      // Verification C: 1-Hop Filter from Database Cluster
      const hop1FromDb = app.filterGraph(updatedGraph, { centerNodeId: db.note.id, hopDepth: 1 });
      const hop1Titles = hop1FromDb.nodes.map(n => n.title);
      assert.ok(hop1Titles.includes('Database Cluster'));
      assert.ok(hop1Titles.includes('Auth Service'));
      assert.ok(hop1Titles.includes('Graph Service'));
      // System Overview links to DB Cluster directly as well
      assert.ok(hop1Titles.includes('System Architecture Overview'));
    }
  },

  {
    id: 'T4.04',
    name: 'Scenario - Zettelkasten Slip-Box Knowledge Network',
    category: 'Real-World Scenarios',
    async run() {
      const app = createAppInstance();

      // Step 1: Create atomic slip-box notes with future placeholder dangling links
      const z1 = await app.createNote({
        title: 'Zettel 101 - Emergence',
        content: 'Complex global behavior emerges from simple local rules. See [[Zettel 102 - Cellular Automata]] and [[Zettel 103 - Ant Colony Optimization]].'
      });

      // Both target links are currently dangling
      assert.strictEqual(z1.outgoing_links[0].is_unresolved, true);
      assert.strictEqual(z1.outgoing_links[1].is_unresolved, true);

      // Step 2: Add Zettel 102
      const z2 = await app.createNote({
        title: 'Zettel 102 - Cellular Automata',
        content: 'Grid of cells governed by transition rules like Conway Game of Life. Connects back to [[Zettel 101 - Emergence]].'
      });

      // Verify link to Zettel 102 is now resolved, but 103 remains dangling
      const z1Updated = await app.getNote(z1.note.id);
      const link102 = z1Updated.outgoing_links.find(l => l.target_title === 'Zettel 102 - Cellular Automata');
      const link103 = z1Updated.outgoing_links.find(l => l.target_title === 'Zettel 103 - Ant Colony Optimization');

      assert.strictEqual(link102.is_unresolved, false);
      assert.strictEqual(link102.target_id, z2.note.id);
      assert.strictEqual(link103.is_unresolved, true);

      // Step 3: Add Zettel 103
      const z3 = await app.createNote({
        title: 'Zettel 103 - Ant Colony Optimization',
        content: 'Probabilistic swarm intelligence algorithm based on pheromone deposition.'
      });

      // Verify all links in Zettel 101 are now resolved
      const z1Final = await app.getNote(z1.note.id);
      assert.ok(z1Final.outgoing_links.every(l => !l.is_unresolved));

      // Verify graph data contains zero phantom unresolved nodes
      const finalGraph = await app.getGraphData();
      const unresolvedNodes = finalGraph.nodes.filter(n => n.is_unresolved);
      assert.strictEqual(unresolvedNodes.length, 0);
      assert.strictEqual(finalGraph.nodes.length, 3);
    }
  },

  {
    id: 'T4.05',
    name: 'Scenario - Full Lifecycle Vault Stress and Invariant Consistency',
    category: 'Real-World Scenarios',
    async run() {
      const app = createAppInstance();

      // 1. Bulk creation of 25 structured notes
      const categories = ['math', 'physics', 'backend', 'frontend', 'system'];
      const notes = [];

      for (let i = 1; i <= 25; i++) {
        const cat = categories[(i - 1) % categories.length];
        const nextId = (i % 25) + 1;
        const note = await app.createNote({
          title: `Vault Entry ${i}`,
          content: `Document body for entry ${i}. Category #${cat}. Cross reference to [[Vault Entry ${nextId}]]. Formula: $x_{${i}} = ${i}^2$.`,
          tags: [cat]
        });
        notes.push(note);
      }

      // Invariant Check 1: Exactly 25 notes created
      const allNotes = await app.listNotes();
      assert.strictEqual(allNotes.length, 25);

      // Invariant Check 2: All tags registered
      const tagSummaries = await app.getAllTags();
      assert.strictEqual(tagSummaries.length, 5);
      for (const t of tagSummaries) {
        assert.strictEqual(t.count, 5); // 25 notes / 5 categories = 5 each
      }

      // Invariant Check 3: Graph consistency
      // Ring topology: 25 notes, 25 directed links, each note has degree 2 (1 in, 1 out)
      const graph = await app.getGraphData();
      assert.strictEqual(graph.nodes.length, 25);
      assert.strictEqual(graph.links.length, 25);
      for (const node of graph.nodes) {
        assert.strictEqual(node.connections_count, 2);
        assert.strictEqual(node.is_orphan, false);
      }

      // Invariant Check 4: Full-text search retrieves indexed formulas and terms
      const searchRes = await app.searchNotes('Vault Entry');
      assert.strictEqual(searchRes.length, 25);

      const specificSearch = await app.searchNotes('x_{17}');
      assert.strictEqual(specificSearch.length, 1);
      assert.strictEqual(specificSearch[0].title, 'Vault Entry 17');

      // 2. Perform selective updates and deletions
      // Delete Entry 5
      const note5 = notes[4];
      await app.deleteNote(note5.note.id);

      // Remaining notes count = 24
      const remainingNotes = await app.listNotes();
      assert.strictEqual(remainingNotes.length, 24);

      // Entry 4's link to Entry 5 should now be unresolved
      const note4 = await app.getNoteByTitle('Vault Entry 4');
      assert.strictEqual(note4.outgoing_links[0].is_unresolved, true);

      // Entry 6's incoming backlinks should no longer include Entry 5
      const note6 = await app.getNoteByTitle('Vault Entry 6');
      const backlinks6 = await app.getBacklinks(note6.note.id);
      const hasNote5 = backlinks6.some(b => b.source_title === 'Vault Entry 5');
      assert.strictEqual(hasNote5, false);
    }
  }
];
