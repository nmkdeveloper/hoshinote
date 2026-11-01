import { describe, it, expect } from 'vitest';
import {
  computeNodeRadius,
  hashTagToColor,
  getNodeColor,
  getEndpointId,
  buildAdjacencyList,
  computeHopNeighborhood,
  filterGraph,
  extractAvailableTags,
  CATPPUCCIN_GROUPS,
  CATPPUCCIN_MOCHA_PALETTE,
  DEFAULT_UNTAGGED_COLOR,
  UNRESOLVED_NODE_COLOR,
  type SimulationNode,
} from '../lib/graphFilter';
import type { GraphData } from '../types';

describe('Graph Filter Engine: Radius & Color Formulas', () => {
  it('computes linear dynamic radius for degrees <= 8 matching backend contract', () => {
    expect(computeNodeRadius(0)).toBe(4.0);
    expect(computeNodeRadius(1)).toBe(6.0);
    expect(computeNodeRadius(2)).toBe(8.0);
    expect(computeNodeRadius(3)).toBe(10.0); // Exact match T1.28
    expect(computeNodeRadius(6)).toBe(16.0); // Exact match T2.28
    expect(computeNodeRadius(8)).toBe(20.0);
  });

  it('bounds dynamic radius logarithmically up to 26px for high-degree hubs', () => {
    const r9 = computeNodeRadius(9);
    const r15 = computeNodeRadius(15);
    const r50 = computeNodeRadius(50);
    const r500 = computeNodeRadius(500);

    expect(r9).toBeGreaterThan(20.0);
    expect(r15).toBeGreaterThan(r9);
    expect(r50).toBeLessThanOrEqual(26.0);
    expect(r500).toBe(26.0);
  });

  it('handles negative or undefined degree safely without NaN', () => {
    expect(computeNodeRadius(-5)).toBe(4.0);
    expect(computeNodeRadius(NaN)).toBe(4.0);
  });

  it('maps known tags to predefined Catppuccin Mocha colors', () => {
    expect(hashTagToColor('math')).toBe(CATPPUCCIN_GROUPS.math);
    expect(hashTagToColor('#Physics')).toBe(CATPPUCCIN_GROUPS.physics);
    expect(hashTagToColor('backend')).toBe(CATPPUCCIN_GROUPS.backend);
    expect(hashTagToColor('frontend')).toBe(CATPPUCCIN_GROUPS.frontend);
    expect(hashTagToColor('draft')).toBe(CATPPUCCIN_GROUPS.draft);
  });

  it('deterministically hashes arbitrary tags via DJB2 into Catppuccin Mocha accents', () => {
    const color1 = hashTagToColor('cryptography');
    const color2 = hashTagToColor('#Cryptography'); // Case and hash prefix normalization
    const color3 = hashTagToColor('machine-learning');

    expect(color1).toBe(color2);
    expect(CATPPUCCIN_MOCHA_PALETTE).toContain(color1);
    expect(CATPPUCCIN_MOCHA_PALETTE).toContain(color3);
  });

  it('returns default colors for untagged, empty, and unresolved nodes', () => {
    expect(hashTagToColor('')).toBe(DEFAULT_UNTAGGED_COLOR);
    expect(getNodeColor({ tags: [], is_unresolved: false, group: 'general' })).toBe(DEFAULT_UNTAGGED_COLOR);
    expect(getNodeColor({ is_unresolved: true })).toBe(UNRESOLVED_NODE_COLOR);
    expect(getNodeColor({ tags: ['#math'], is_unresolved: false })).toBe(CATPPUCCIN_GROUPS.math);
  });
});

describe('Graph Traversal: Adjacency & BFS Hop Neighborhood', () => {
  const sampleGraph: GraphData = {
    nodes: [
      { id: 'A', title: 'Node A', tags: ['#math'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'B', title: 'Node B', tags: ['#math'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'C', title: 'Node C', tags: ['#cs'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'D', title: 'Node D', tags: ['#cs'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'Orphan', title: 'Isolated Node', tags: [], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general' },
    ],
    links: [
      { source: 'A', target: 'B', is_unresolved: false },
      { source: 'B', target: 'C', is_unresolved: false },
      { source: 'C', target: 'D', is_unresolved: false },
    ],
  };

  it('normalizes link endpoints whether string ID or mutated d3 object', () => {
    expect(getEndpointId('node-1')).toBe('node-1');
    expect(getEndpointId({ id: 'node-2', x: 10, y: 20 })).toBe('node-2');
    expect(getEndpointId(null)).toBe('');
    expect(getEndpointId(undefined)).toBe('');
  });

  it('builds bidirectional adjacency list including isolated nodes', () => {
    const adj = buildAdjacencyList(sampleGraph);
    expect(adj.get('A')?.has('B')).toBe(true);
    expect(adj.get('B')?.has('A')).toBe(true);
    expect(adj.get('B')?.has('C')).toBe(true);
    expect(adj.get('Orphan')?.size).toBe(0);
  });

  it('computes 1-hop and 2-hop neighborhood with distance tracking', () => {
    // 1 hop from B -> { B: 0, A: 1, C: 1 }
    const hop1 = computeHopNeighborhood('B', sampleGraph, 1);
    expect(hop1.get('B')).toBe(0);
    expect(hop1.get('A')).toBe(1);
    expect(hop1.get('C')).toBe(1);
    expect(hop1.has('D')).toBe(false);

    // 2 hops from A -> { A: 0, B: 1, C: 2 }
    const hop2 = computeHopNeighborhood('A', sampleGraph, 2);
    expect(hop2.get('A')).toBe(0);
    expect(hop2.get('B')).toBe(1);
    expect(hop2.get('C')).toBe(2);
    expect(hop2.has('D')).toBe(false);

    // 3 hops from A -> { A: 0, B: 1, C: 2, D: 3 }
    const hop3 = computeHopNeighborhood('A', sampleGraph, 3);
    expect(hop3.get('D')).toBe(3);
  });

  it('handles isolated orphan node hop neighborhood by returning only itself', () => {
    const orphanHops = computeHopNeighborhood('Orphan', sampleGraph, 3);
    expect(orphanHops.size).toBe(1);
    expect(orphanHops.get('Orphan')).toBe(0);
  });

  it('prevents infinite loops in cyclic graphs during BFS', () => {
    const cyclicGraph: GraphData = {
      nodes: [
        { id: '1', title: '1', tags: [], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
        { id: '2', title: '2', tags: [], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
        { id: '3', title: '3', tags: [], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
      ],
      links: [
        { source: '1', target: '2', is_unresolved: false },
        { source: '2', target: '3', is_unresolved: false },
        { source: '3', target: '1', is_unresolved: false },
      ],
    };

    const hops = computeHopNeighborhood('1', cyclicGraph, 5);
    expect(hops.size).toBe(3);
    expect(hops.get('1')).toBe(0);
    expect(hops.get('2')).toBe(1);
    expect(hops.get('3')).toBe(1);
  });
});

describe('Multi-Criteria Graph Filtering & Edge Consistency', () => {
  const fullGraph: GraphData = {
    nodes: [
      { id: 'n1', title: 'Calculus Fundamentals', tags: ['#math', '#math/calculus'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'n2', title: 'Linear Algebra', tags: ['#math'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'n3', title: 'Quantum Mechanics', tags: ['#physics'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'physics' },
      { id: 'n4', title: 'Solitary Island', tags: ['#journal'], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general' },
      { id: 'unresolved:Draft Idea', title: 'Draft Idea', tags: [], connections_count: 1, is_orphan: false, is_unresolved: true, group: 'draft' },
    ],
    links: [
      { source: 'n1', target: 'n2', is_unresolved: false },
      { source: 'n2', target: 'n3', is_unresolved: false },
      { source: 'n1', target: 'unresolved:Draft Idea', is_unresolved: true },
    ],
  };

  it('filters by search query matching title or tag', () => {
    const res = filterGraph(fullGraph, { searchQuery: 'calculus' });
    expect(res.filteredGraph.nodes.length).toBe(1);
    expect(res.filteredGraph.nodes[0].id).toBe('n1');
    expect(res.filteredGraph.links.length).toBe(0); // target n2 was pruned
  });

  it('filters by tag with hierarchical prefix support', () => {
    // #math should match both #math and #math/calculus
    const res = filterGraph(fullGraph, { tag: 'math' });
    expect(res.filteredGraph.nodes.length).toBe(2);
    expect(res.filteredGraph.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(res.filteredGraph.links.length).toBe(1);
    expect(res.filteredGraph.links[0].source).toBe('n1');
    expect(res.filteredGraph.links[0].target).toBe('n2');
  });

  it('prunes orphan nodes when hideOrphans is active', () => {
    const res = filterGraph(fullGraph, { hideOrphans: true });
    const hasOrphan = res.filteredGraph.nodes.some((n) => n.is_orphan);
    expect(hasOrphan).toBe(false);
    expect(res.filteredGraph.nodes.find((n) => n.id === 'n4')).toBeUndefined();
  });

  it('prunes phantom nodes and unresolved links when showGhostNodes is false', () => {
    const res = filterGraph(fullGraph, { showGhostNodes: false });
    const hasGhostNode = res.filteredGraph.nodes.some((n) => n.is_unresolved);
    const hasGhostLink = res.filteredGraph.links.some((l) => l.is_unresolved);

    expect(hasGhostNode).toBe(false);
    expect(hasGhostLink).toBe(false);
    expect(res.filteredGraph.nodes.length).toBe(4);
    expect(res.filteredGraph.links.length).toBe(2);
  });

  it('combines hop-depth with tag filtering strictly', () => {
    // 1-hop from n2 within full graph -> n1, n2, n3
    const hopRes = filterGraph(fullGraph, { centerNodeId: 'n2', hopDepth: 1, tag: 'math' });
    // Tag filter limits to math nodes only -> n1, n2
    expect(hopRes.filteredGraph.nodes.length).toBe(2);
    expect(hopRes.filteredGraph.nodes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(hopRes.filteredGraph.links.length).toBe(1);
  });

  it('preserves node coordinates (x, y, vx, vy) from persistent registry', () => {
    const registry = new Map<string, SimulationNode>();
    registry.set('n1', {
      ...fullGraph.nodes[0],
      x: 142.5,
      y: -88.3,
      vx: 0.12,
      vy: -0.05,
    });

    const res = filterGraph(fullGraph, { searchQuery: 'Calculus' }, registry);
    expect(res.filteredGraph.nodes.length).toBe(1);
    const node = res.filteredGraph.nodes[0] as SimulationNode;

    expect(node.x).toBe(142.5);
    expect(node.y).toBe(-88.3);
    expect(node.vx).toBe(0.12);
    expect(node.vy).toBe(-0.05);
  });

  it('extracts unique tags with sorted frequencies', () => {
    const tags = extractAvailableTags(fullGraph.nodes);
    expect(tags[0].tag).toBe('math');
    expect(tags[0].count).toBe(2);
    expect(tags.some((t) => t.tag === 'physics')).toBe(true);
    expect(tags.some((t) => t.tag === 'journal')).toBe(true);
  });
});
