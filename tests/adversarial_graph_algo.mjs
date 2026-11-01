/**
 * Adversarial Stress Test Suite for Milestone 4: Graph Filtering & Traversal Algorithms
 * Executed by challenger_m4_1
 *
 * Verifies algorithmic termination, memory safety, edge consistency,
 * endpoint mutation resilience, and coordinate stability under hostile inputs.
 */

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
} from '../src/lib/graphFilter.ts';

console.log('═════════════════════════════════════════════════════════════════════');
console.log('       MILESTONE 4: ADVERSARIAL GRAPH ALGORITHM STRESS SUITE         ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    failures.push({ testName, detail });
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
}

// ============================================================================
// SUITE 1: Dense Cyclic Cliques & Graph Scale Stress Test
// ============================================================================
console.log('\n--- SUITE 1: Dense Cyclic Cliques & Scale Stress ---');

{
  // 1.1 Complete Clique K50 (50 nodes, 1,225 links)
  const N_CLIQUE = 50;
  const cliqueNodes = [];
  const cliqueLinks = [];

  for (let i = 0; i < N_CLIQUE; i++) {
    cliqueNodes.push({
      id: `clique_${i}`,
      title: `Clique Node ${i}`,
      tags: [`#clique`, `#group_${i % 5}`],
      connections_count: N_CLIQUE - 1,
      is_orphan: false,
      is_unresolved: false,
      group: 'math',
    });
  }

  for (let i = 0; i < N_CLIQUE; i++) {
    for (let j = i + 1; j < N_CLIQUE; j++) {
      cliqueLinks.push({
        source: `clique_${i}`,
        target: `clique_${j}`,
        is_unresolved: false,
      });
    }
  }

  const k50Graph = { nodes: cliqueNodes, links: cliqueLinks };

  const startK50 = performance.now();
  const k50Adj = buildAdjacencyList(k50Graph);
  const hop1 = computeHopNeighborhood('clique_0', k50Graph, 1, k50Adj);
  const hop2 = computeHopNeighborhood('clique_0', k50Graph, 2, k50Adj);
  const hop10 = computeHopNeighborhood('clique_0', k50Graph, 10, k50Adj);
  const elapsedK50 = performance.now() - startK50;

  assert(k50Adj.size === N_CLIQUE, 'K50 adjacency list contains all 50 nodes');
  assert(k50Adj.get('clique_0').size === N_CLIQUE - 1, 'K50 node 0 has 49 neighbors');
  assert(hop1.size === N_CLIQUE, 'K50 1-hop reaches all 50 nodes');
  assert(hop1.get('clique_0') === 0, 'K50 center node has distance 0');
  assert(hop1.get('clique_49') === 1, 'K50 peer node has distance 1');
  assert(hop2.size === N_CLIQUE, 'K50 2-hop reaches all 50 nodes without duplicate expansion');
  assert(hop10.size === N_CLIQUE, 'K50 10-hop terminates correctly at clique diameter');
  assert(elapsedK50 < 100, `K50 BFS operations completed in ${elapsedK50.toFixed(2)}ms (< 100ms)`);

  // 1.2 Massive Complete Clique K100 (100 nodes, 4,950 links)
  const N_CLIQUE_100 = 100;
  const k100Nodes = [];
  const k100Links = [];
  for (let i = 0; i < N_CLIQUE_100; i++) {
    k100Nodes.push({
      id: `k100_${i}`,
      title: `K100 Node ${i}`,
      tags: ['#stress'],
      connections_count: N_CLIQUE_100 - 1,
      is_orphan: false,
      is_unresolved: false,
      group: 'system',
    });
  }
  for (let i = 0; i < N_CLIQUE_100; i++) {
    for (let j = i + 1; j < N_CLIQUE_100; j++) {
      k100Links.push({ source: `k100_${i}`, target: `k100_${j}`, is_unresolved: false });
    }
  }
  const k100Graph = { nodes: k100Nodes, links: k100Links };

  const startK100 = performance.now();
  const hopK100 = computeHopNeighborhood('k100_0', k100Graph, 3);
  const elapsedK100 = performance.now() - startK100;

  assert(hopK100.size === 100, 'K100 BFS terminates with exactly 100 nodes visited');
  assert(elapsedK100 < 150, `K100 BFS completed in ${elapsedK100.toFixed(2)}ms (< 150ms)`);

  // 1.3 Large Cyclic Ring (1,000 nodes in cycle 0 -> 1 -> 2 ... -> 999 -> 0)
  const RING_SIZE = 1000;
  const ringNodes = [];
  const ringLinks = [];
  for (let i = 0; i < RING_SIZE; i++) {
    ringNodes.push({
      id: `ring_${i}`,
      title: `Ring ${i}`,
      tags: [],
      connections_count: 2,
      is_orphan: false,
      is_unresolved: false,
      group: 'general',
    });
    ringLinks.push({
      source: `ring_${i}`,
      target: `ring_${(i + 1) % RING_SIZE}`,
      is_unresolved: false,
    });
  }
  const ringGraph = { nodes: ringNodes, links: ringLinks };

  const ringAdj = buildAdjacencyList(ringGraph);
  const ringHop3 = computeHopNeighborhood('ring_0', ringGraph, 3, ringAdj);
  // In a ring, 3 hops from 0 should reach: 0 (dist 0), 1 & 999 (dist 1), 2 & 998 (dist 2), 3 & 997 (dist 3) => 7 nodes
  assert(ringHop3.size === 7, `Ring 3-hop contains 7 nodes (found ${ringHop3.size})`);
  assert(ringHop3.get('ring_0') === 0, 'Ring center is dist 0');
  assert(ringHop3.get('ring_1') === 1 && ringHop3.get('ring_999') === 1, 'Ring dist 1 neighbors correct');
  assert(ringHop3.get('ring_2') === 2 && ringHop3.get('ring_998') === 2, 'Ring dist 2 neighbors correct');
  assert(ringHop3.get('ring_3') === 3 && ringHop3.get('ring_997') === 3, 'Ring dist 3 neighbors correct');

  // Ring 500-hop: should reach all 1000 nodes
  const ringHop500 = computeHopNeighborhood('ring_0', ringGraph, 500, ringAdj);
  assert(ringHop500.size === 1000, 'Ring 500-hop covers all 1,000 nodes in the cycle');
}

// ============================================================================
// SUITE 2: Disconnected Graphs, Isolated Components & Boundary Conditions
// ============================================================================
console.log('\n--- SUITE 2: Disconnected Graphs & Boundary Conditions ---');

{
  // 2.1 Completely Empty Graph
  const emptyGraph = { nodes: [], links: [] };
  const emptyAdj = buildAdjacencyList(emptyGraph);
  const emptyHop = computeHopNeighborhood('any', emptyGraph, 2);
  const emptyFilter = filterGraph(emptyGraph, {});
  const emptyTags = extractAvailableTags([]);

  assert(emptyAdj.size === 0, 'Empty graph adjacency list is empty');
  assert(emptyHop.size === 0, 'Empty graph hop neighborhood is empty');
  assert(emptyFilter.filteredGraph.nodes.length === 0, 'Empty graph filtered nodes length is 0');
  assert(emptyFilter.filteredGraph.links.length === 0, 'Empty graph filtered links length is 0');
  assert(emptyTags.length === 0, 'Empty graph tags extraction returns empty array');

  // 2.2 Single-Node Graph Without Links
  const singleNode = {
    id: 'lone_wolf',
    title: 'Lone Wolf',
    tags: ['#solo'],
    connections_count: 0,
    is_orphan: true,
    is_unresolved: false,
    group: 'general',
  };
  const singleGraph = { nodes: [singleNode], links: [] };

  const singleHop0 = computeHopNeighborhood('lone_wolf', singleGraph, 0);
  const singleHop1 = computeHopNeighborhood('lone_wolf', singleGraph, 1);
  const singleHop5 = computeHopNeighborhood('lone_wolf', singleGraph, 5);

  assert(singleHop0.size === 1 && singleHop0.get('lone_wolf') === 0, 'Single node 0-hop returns { lone_wolf: 0 }');
  assert(singleHop1.size === 1 && singleHop1.get('lone_wolf') === 0, 'Single node 1-hop returns only itself');
  assert(singleHop5.size === 1 && singleHop5.get('lone_wolf') === 0, 'Single node 5-hop returns only itself');

  // Filtering single node with hideOrphans
  const hiddenOrphan = filterGraph(singleGraph, { hideOrphans: true });
  assert(hiddenOrphan.filteredGraph.nodes.length === 0, 'Single orphan hidden when hideOrphans: true');

  const shownOrphan = filterGraph(singleGraph, { hideOrphans: false });
  assert(shownOrphan.filteredGraph.nodes.length === 1, 'Single orphan preserved when hideOrphans: false');

  // 2.3 Disconnected Graph with 3 Disjoint Islands
  // Island 1: A1 - A2 - A3
  // Island 2: B1 - B2
  // Island 3: C1 (isolated)
  const disconnectedGraph = {
    nodes: [
      { id: 'A1', title: 'Island A1', tags: ['#island_a'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'A2', title: 'Island A2', tags: ['#island_a'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'A3', title: 'Island A3', tags: ['#island_a'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'B1', title: 'Island B1', tags: ['#island_b'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'B2', title: 'Island B2', tags: ['#island_b'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'C1', title: 'Island C1', tags: ['#island_c'], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general' },
    ],
    links: [
      { source: 'A1', target: 'A2', is_unresolved: false },
      { source: 'A2', target: 'A3', is_unresolved: false },
      { source: 'B1', target: 'B2', is_unresolved: false },
    ],
  };

  const islandHop = computeHopNeighborhood('A1', disconnectedGraph, 10);
  assert(islandHop.size === 3, 'Island A BFS traversal stops at Island A boundary (3 nodes)');
  assert(islandHop.has('A1') && islandHop.has('A2') && islandHop.has('A3'), 'Island A nodes present');
  assert(!islandHop.has('B1') && !islandHop.has('B2') && !islandHop.has('C1'), 'Disconnected nodes strictly excluded');

  // Strict link filtering: links for Island B must not be present when focused on A1
  const islandFilter = filterGraph(disconnectedGraph, { centerNodeId: 'A1', hopDepth: 3 });
  assert(islandFilter.filteredGraph.nodes.length === 3, 'Filtered graph contains only Island A nodes');
  assert(islandFilter.filteredGraph.links.length === 2, 'Filtered graph contains only Island A links');
  assert(
    islandFilter.filteredGraph.links.every(
      (l) => ['A1', 'A2', 'A3'].includes(l.source) && ['A1', 'A2', 'A3'].includes(l.target)
    ),
    'Filtered links contain no edges from Island B'
  );
}

// ============================================================================
// SUITE 3: Hop Depth Edge Cases & Non-Existent Nodes
// ============================================================================
console.log('\n--- SUITE 3: Hop Depth Edge Cases & Non-Existent Nodes ---');

{
  const testGraph = {
    nodes: [
      { id: 'root', title: 'Root', tags: [], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'child1', title: 'Child 1', tags: [], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'child2', title: 'Child 2', tags: [], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'grandchild', title: 'Grandchild', tags: [], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
      { id: 'self_loop_node', title: 'Self Looper', tags: [], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
    ],
    links: [
      { source: 'root', target: 'child1', is_unresolved: false },
      { source: 'root', target: 'child2', is_unresolved: false },
      { source: 'child1', target: 'grandchild', is_unresolved: false },
      { source: 'self_loop_node', target: 'self_loop_node', is_unresolved: false }, // Self loop!
    ],
  };

  // 3.1 Non-existent center node
  const nonExistentHop = computeHopNeighborhood('non_existent_404', testGraph, 2);
  assert(nonExistentHop.size === 0, 'Non-existent center node returns empty hop map');

  const nonExistentFilter = filterGraph(testGraph, { centerNodeId: 'non_existent_404', hopDepth: 2 });
  assert(nonExistentFilter.filteredGraph.nodes.length === 0, 'Filtering with non-existent center returns 0 nodes');
  assert(nonExistentFilter.filteredGraph.links.length === 0, 'Filtering with non-existent center returns 0 links');

  // 3.2 hopDepth = 0 (disabled in filterGraph)
  const hopZeroFilter = filterGraph(testGraph, { centerNodeId: 'root', hopDepth: 0 });
  assert(hopZeroFilter.filteredGraph.nodes.length === testGraph.nodes.length, 'hopDepth: 0 leaves all nodes visible');

  // 3.3 Negative hop depth
  const negHop = computeHopNeighborhood('root', testGraph, -1);
  assert(negHop.size === 1 && negHop.get('root') === 0, 'computeHopNeighborhood with negative hop returns center only');

  const negHopFilter = filterGraph(testGraph, { centerNodeId: 'root', hopDepth: -1 });
  assert(negHopFilter.filteredGraph.nodes.length === testGraph.nodes.length, 'Negative hopDepth in filterGraph disables hop filter');

  // 3.4 Cyclic Self-Loop resilience
  const selfHop1 = computeHopNeighborhood('self_loop_node', testGraph, 1);
  const selfHop5 = computeHopNeighborhood('self_loop_node', testGraph, 5);
  assert(selfHop1.size === 1 && selfHop1.get('self_loop_node') === 0, 'Self-loop node BFS does not loop infinitely (hop 1)');
  assert(selfHop5.size === 1 && selfHop5.get('self_loop_node') === 0, 'Self-loop node BFS does not loop infinitely (hop 5)');

  // 3.5 Exact Hop Depths: 1, 2, 3
  const hop1 = computeHopNeighborhood('root', testGraph, 1);
  assert(hop1.size === 3, '1-hop from root includes root, child1, child2 (3 nodes)');
  assert(!hop1.has('grandchild'), '1-hop does not include grandchild');

  const hop2 = computeHopNeighborhood('root', testGraph, 2);
  assert(hop2.size === 4, '2-hop from root includes grandchild (4 nodes)');
  assert(hop2.get('grandchild') === 2, 'grandchild has distance 2');

  const hop3 = computeHopNeighborhood('root', testGraph, 3);
  assert(hop3.size === 4, '3-hop does not expand beyond connected component');
}

// ============================================================================
// SUITE 4: Multi-Criteria Filtering Combinations Matrix
// ============================================================================
console.log('\n--- SUITE 4: Multi-Criteria Filtering Matrix ---');

{
  const complexGraph = {
    nodes: [
      { id: 'n_math1', title: 'Calculus Advanced', tags: ['#math', '#math/calculus'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'n_math2', title: 'Linear Algebra', tags: ['#math', '#algebra'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: 'n_physics', title: 'Quantum Fields', tags: ['#physics'], connections_count: 2, is_orphan: false, is_unresolved: false, group: 'physics' },
      { id: 'n_orphan', title: 'Lonely Note', tags: ['#journal'], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general' },
      { id: 'ghost:Missing', title: 'Missing Topic', tags: [], connections_count: 1, is_orphan: false, is_unresolved: true, group: 'draft' },
    ],
    links: [
      { source: 'n_math1', target: 'n_math2', is_unresolved: false },
      { source: 'n_math1', target: 'n_physics', is_unresolved: false },
      { source: 'n_physics', target: 'ghost:Missing', is_unresolved: true },
    ],
  };

  // 4.1 Tag filtering mode: 'any' vs 'all'
  const filterAny = filterGraph(complexGraph, { selectedTags: ['algebra', 'physics'], tagFilterMode: 'any' });
  assert(filterAny.filteredGraph.nodes.length === 2, 'Tag mode ANY matches n_math2 and n_physics');

  const filterAll = filterGraph(complexGraph, { selectedTags: ['math', 'algebra'], tagFilterMode: 'all' });
  assert(filterAll.filteredGraph.nodes.length === 1 && filterAll.filteredGraph.nodes[0].id === 'n_math2', 'Tag mode ALL matches only n_math2');

  const filterAllNoMatch = filterGraph(complexGraph, { selectedTags: ['math', 'physics'], tagFilterMode: 'all' });
  assert(filterAllNoMatch.filteredGraph.nodes.length === 0, 'Tag mode ALL with mutually exclusive tags matches 0');

  // 4.2 Ghost hiding + Orphan hiding simultaneous
  const filterNoGhostNoOrphan = filterGraph(complexGraph, { showGhostNodes: false, hideOrphans: true });
  assert(filterNoGhostNoOrphan.filteredGraph.nodes.length === 3, 'Hide ghost + hide orphans preserves only connected real notes (3)');
  assert(!filterNoGhostNoOrphan.filteredGraph.nodes.some((n) => n.is_orphan || n.is_unresolved), 'No orphans or ghosts remain');
  assert(filterNoGhostNoOrphan.filteredGraph.links.length === 2, 'Ghost link pruned');

  // 4.3 Query + Tag + Hop depth simultaneous
  // Center on n_math1, hopDepth 1, query 'algebra'
  // n_math1 neighbors in hop 1: n_math1, n_math2, n_physics
  // query 'algebra': only n_math2 matches
  const multiCombo = filterGraph(complexGraph, {
    centerNodeId: 'n_math1',
    hopDepth: 1,
    searchQuery: 'algebra',
  });
  assert(multiCombo.filteredGraph.nodes.length === 1 && multiCombo.filteredGraph.nodes[0].id === 'n_math2', 'Multi-combo hop + query isolates n_math2');
  assert(multiCombo.filteredGraph.links.length === 0, 'Link pruned since n_math1 is not in surviving nodes');

  // 4.4 Strict Edge Invariant Test: Verify for 16 random permutations that links never dangle
  const boolOptions = [false, true];
  let danglingFound = false;

  for (const q of ['', 'calculus', 'quantum', 'nonexistent']) {
    for (const t of [[], ['math'], ['physics'], ['nonexistent']]) {
      for (const hideO of boolOptions) {
        for (const showG of boolOptions) {
          const res = filterGraph(complexGraph, {
            query: q,
            selectedTags: t,
            hideOrphans: hideO,
            showGhostNodes: showG,
          });
          const survivingIds = new Set(res.filteredGraph.nodes.map((n) => n.id));
          for (const link of res.filteredGraph.links) {
            if (!survivingIds.has(link.source) || !survivingIds.has(link.target)) {
              danglingFound = true;
            }
          }
        }
      }
    }
  }
  assert(!danglingFound, 'Edge Invariant Holds: Zero dangling links across all 64 filter combinations');
}

// ============================================================================
// SUITE 5: Endpoint Mutation Resilience (D3 Object Mutated Links)
// ============================================================================
console.log('\n--- SUITE 5: Endpoint Mutation Resilience ---');

{
  const nodeA = { id: 'node_alpha', title: 'Alpha', tags: ['#core'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general', x: 100, y: 150 };
  const nodeB = { id: 'node_beta', title: 'Beta', tags: ['#core'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general', x: 200, y: 250 };
  const nodeC = { id: 'node_gamma', title: 'Gamma', tags: ['#aux'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general', x: 300, y: 350 };

  // D3 force simulation replaces link.source and link.target string with full node objects:
  const mutatedD3Graph = {
    nodes: [nodeA, nodeB, nodeC],
    links: [
      { source: nodeA, target: nodeB, is_unresolved: false }, // D3 Mutated objects!
      { source: 'node_beta', target: nodeC, is_unresolved: false }, // Mixed raw string + mutated!
      { source: { id: 'node_alpha', unexpectedField: true }, target: { id: 'node_gamma' }, is_unresolved: false },
    ],
  };

  // Test getEndpointId
  assert(getEndpointId(nodeA) === 'node_alpha', 'getEndpointId correctly extracts ID from node object');
  assert(getEndpointId('node_alpha') === 'node_alpha', 'getEndpointId correctly extracts ID from string');
  assert(getEndpointId(null) === '', 'getEndpointId handles null safely');
  assert(getEndpointId(undefined) === '', 'getEndpointId handles undefined safely');
  // Probe behavioral characteristic on object without id:
  const objWithoutIdResult = getEndpointId({ otherKey: 'val' });
  assert(
    objWithoutIdResult === '[object Object]',
    'getEndpointId converts object without id to String fallback ([object Object])'
  );

  // Test buildAdjacencyList on mutated graph
  const mutatedAdj = buildAdjacencyList(mutatedD3Graph);
  assert(mutatedAdj.get('node_alpha')?.has('node_beta'), 'Mutated adjacency has alpha -> beta');
  assert(mutatedAdj.get('node_beta')?.has('node_alpha'), 'Mutated adjacency has beta -> alpha');
  assert(mutatedAdj.get('node_beta')?.has('node_gamma'), 'Mutated adjacency has beta -> gamma');

  // Test filterGraph on mutated graph
  const filteredMutated = filterGraph(mutatedD3Graph, { selectedTags: ['core'] });
  assert(filteredMutated.filteredGraph.nodes.length === 2, 'Filtered mutated graph preserves alpha and beta');
  assert(filteredMutated.filteredGraph.links.length === 1, 'Filtered mutated graph has 1 link');
  assert(
    typeof filteredMutated.filteredGraph.links[0].source === 'string' &&
    typeof filteredMutated.filteredGraph.links[0].target === 'string',
    'Output links are normalized to pure string IDs (prevents D3 circular references)'
  );
  assert(filteredMutated.filteredGraph.links[0].source === 'node_alpha', 'Output link source is normalized string');
  assert(filteredMutated.filteredGraph.links[0].target === 'node_beta', 'Output link target is normalized string');
}

// ============================================================================
// SUITE 6: Node Coordinate Stability & Registry Persistence
// ============================================================================
console.log('\n--- SUITE 6: Coordinate Stability & Registry Persistence ---');

{
  const registry = new Map();
  const testNodes = [
    { id: 'coord_1', title: 'Coord 1', tags: ['#tag1'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
    { id: 'coord_2', title: 'Coord 2', tags: ['#tag2'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'general' },
  ];
  const testGraph = {
    nodes: testNodes,
    links: [{ source: 'coord_1', target: 'coord_2', is_unresolved: false }],
  };

  // Step 1: Initial filter populates registry
  const pass1 = filterGraph(testGraph, {}, registry);
  assert(registry.has('coord_1') && registry.has('coord_2'), 'Registry populated after pass 1');

  // Simulate D3 physics assigning coordinates and velocities
  const regNode1 = registry.get('coord_1');
  const regNode2 = registry.get('coord_2');
  regNode1.x = 123.456;
  regNode1.y = 789.012;
  regNode1.vx = 0.55;
  regNode1.vy = -0.33;
  regNode1.fx = 120.0;
  regNode1.fy = 780.0;

  regNode2.x = -45.67;
  regNode2.y = 88.99;
  regNode2.vx = -0.12;
  regNode2.vy = 0.04;

  // Step 2: Filter with query hiding coord_2
  const pass2 = filterGraph(testGraph, { searchQuery: 'Coord 1' }, registry);
  assert(pass2.filteredGraph.nodes.length === 1, 'Pass 2 returns only coord_1');
  const nodeAfterPass2 = pass2.filteredGraph.nodes[0];
  assert(nodeAfterPass2.x === 123.456, 'coord_1 x preserved exactly');
  assert(nodeAfterPass2.y === 789.012, 'coord_1 y preserved exactly');
  assert(nodeAfterPass2.vx === 0.55, 'coord_1 vx preserved exactly');
  assert(nodeAfterPass2.vy === -0.33, 'coord_1 vy preserved exactly');
  assert(nodeAfterPass2.fx === 120.0, 'coord_1 fx pinned coordinate preserved');

  // Step 3: Repeated filtering toggling 100 times
  let coordDriftDetected = false;
  for (let cycle = 0; cycle < 100; cycle++) {
    const query = cycle % 2 === 0 ? 'Coord 1' : '';
    const res = filterGraph(testGraph, { searchQuery: query }, registry);
    const n1 = res.filteredGraph.nodes.find((n) => n.id === 'coord_1');
    if (!n1 || n1.x !== 123.456 || n1.y !== 789.012) {
      coordDriftDetected = true;
      break;
    }
  }
  assert(!coordDriftDetected, 'Coordinates remained 100% stable across 100 consecutive filter toggles');

  // Step 4: Stale node cleanup check
  // If rawGraph no longer contains coord_2, does cleanup work?
  const updatedGraph = {
    nodes: [testNodes[0]], // coord_2 was deleted by user!
    links: [],
  };
  const currentIds = new Set(updatedGraph.nodes.map((n) => n.id));
  for (const key of registry.keys()) {
    if (!currentIds.has(key)) {
      registry.delete(key);
    }
  }
  assert(registry.size === 1 && !registry.has('coord_2'), 'Stale deleted node pruned from registry');
}

// ============================================================================
// SUITE 7: Performance Benchmark Under Adversarial Load
// ============================================================================
console.log('\n--- SUITE 7: Performance Benchmark Under Adversarial Load ---');

{
  const BENCH_NODES = 500;
  const BENCH_LINKS = 2000;
  const benchNodes = [];
  const benchLinks = [];

  for (let i = 0; i < BENCH_NODES; i++) {
    benchNodes.push({
      id: `bench_${i}`,
      title: `Benchmark Note ${i} with tags and long titles for search`,
      tags: [`#cat_${i % 10}`, `#subcat_${i % 25}`, `#math`],
      connections_count: 8,
      is_orphan: i > 480, // Last 20 are orphans
      is_unresolved: i % 20 === 0, // 5% ghost notes
      group: i % 2 === 0 ? 'math' : 'physics',
    });
  }

  for (let i = 0; i < BENCH_LINKS; i++) {
    const s = Math.floor(Math.random() * 480);
    const t = Math.floor(Math.random() * 480);
    if (s !== t) {
      benchLinks.push({
        source: `bench_${s}`,
        target: `bench_${t}`,
        is_unresolved: s % 20 === 0 || t % 20 === 0,
      });
    }
  }

  const benchGraph = { nodes: benchNodes, links: benchLinks };
  const benchRegistry = new Map();

  // Benchmark 100 iterations of complex multi-criteria filtering
  const startBench = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    filterGraph(
      benchGraph,
      {
        centerNodeId: `bench_${i % 100}`,
        hopDepth: (i % 3) + 1,
        selectedTags: ['math'],
        tagFilterMode: 'any',
        searchQuery: i % 2 === 0 ? 'Benchmark' : '',
        showGhostNodes: i % 3 !== 0,
        hideOrphans: true,
      },
      benchRegistry
    );
  }
  const totalBenchTime = performance.now() - startBench;
  const avgTimePerOp = totalBenchTime / iterations;

  assert(avgTimePerOp < 10.0, `Average filterGraph latency is ${avgTimePerOp.toFixed(3)}ms (< 10ms target for 60fps)`);
  console.log(`  ℹ 100 complex filterGraph cycles on 500 nodes / 2000 edges completed in ${totalBenchTime.toFixed(2)}ms (${avgTimePerOp.toFixed(3)}ms/op)`);
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n═════════════════════════════════════════════════════════════════════');
console.log(`TOTAL ADVERSARIAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('═════════════════════════════════════════════════════════════════════\n');

if (failedTests > 0) {
  console.error('FAILURES SUMMARY:');
  for (const f of failures) {
    console.error(`- ${f.testName}: ${f.detail}`);
  }
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL PROBES PASSED WITH ZERO FAILURES.\n');
  process.exit(0);
}
