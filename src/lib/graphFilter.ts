import type { GraphData, GraphNode, GraphLink } from '../types';

export interface SimulationNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

export interface GraphFilterOptions {
  // Search query filters
  searchQuery?: string;
  query?: string; // Reference oracle alias

  // Tag filters
  selectedTags?: string[];
  tag?: string; // Reference oracle alias
  tagFilterMode?: 'any' | 'all';

  // Toggle filters
  showOrphans?: boolean;
  hideOrphans?: boolean; // Reference oracle alias
  showGhostNodes?: boolean;
  hideUnresolved?: boolean; // Reference oracle alias

  // Hop depth / Neighborhood
  focusedNodeId?: string | null;
  centerNodeId?: string | null; // Reference oracle alias
  hopDepth?: number; // 0 = disabled/all, 1 = 1-hop, 2 = 2-hop, 3 = 3-hop
}

export interface FilterResult {
  filteredGraph: GraphData;
  hopDistanceMap: Map<string, number>;
  matchedNodeIds: Set<string>;
}

// Catppuccin Mocha tag color palette
export const CATPPUCCIN_MOCHA_PALETTE: string[] = [
  '#f38ba8', // Red
  '#fab387', // Peach
  '#f9e2af', // Yellow
  '#a6e3a1', // Green
  '#94e2d5', // Teal
  '#89dceb', // Sky
  '#89b4fa', // Blue
  '#cba6f7', // Mauve
  '#b4befe', // Lavender
  '#f5c2e7', // Pink
];

// Predefined semantic groups matching backend and Obsidian conventions
export const CATPPUCCIN_GROUPS: Record<string, string> = {
  general: '#cdd6f4', // Text
  math: '#89b4fa',    // Blue
  physics: '#a6e3a1', // Green
  backend: '#f38ba8', // Red
  frontend: '#fab387',// Peach
  database: '#f9e2af',// Yellow
  paper: '#cba6f7',   // Mauve
  system: '#94e2d5',  // Teal
  draft: '#6c7086',   // Overlay0 (phantom/unresolved nodes)
};

export const DEFAULT_UNTAGGED_COLOR = '#a6adc8'; // Subtext0
export const UNRESOLVED_NODE_COLOR = '#6c7086';  // Overlay0

/**
 * Deterministically maps any tag string to a Catppuccin color.
 * Uses DJB2 hash algorithm for uniform distribution across accents.
 */
export function hashTagToColor(tag: string): string {
  const clean = tag.replace(/^#/, '').toLowerCase().trim();
  if (!clean) return DEFAULT_UNTAGGED_COLOR;
  if (CATPPUCCIN_GROUPS[clean]) return CATPPUCCIN_GROUPS[clean];

  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
  }
  const index = Math.abs(hash) % CATPPUCCIN_MOCHA_PALETTE.length;
  return CATPPUCCIN_MOCHA_PALETTE[index];
}

/**
 * Returns the hex color for a given node based on its unresolved status and tags.
 */
export function getNodeColor(node: { tags?: string[]; is_unresolved?: boolean; group?: string }): string {
  if (node.is_unresolved) {
    return UNRESOLVED_NODE_COLOR;
  }
  if (node.tags && node.tags.length > 0) {
    return hashTagToColor(node.tags[0]);
  }
  if (node.group && node.group !== 'general' && CATPPUCCIN_GROUPS[node.group.toLowerCase()]) {
    return CATPPUCCIN_GROUPS[node.group.toLowerCase()];
  }
  return DEFAULT_UNTAGGED_COLOR;
}

/**
 * Computes dynamic node radius based on connection degree:
 * R = 4.0 + 2.0 * deg for deg <= 8 (matching backend contract & T1.28)
 * Logarithmically bounded up to 26.0px for dense hubs.
 */
export function computeNodeRadius(connectionsCount: number): number {
  const deg = Math.max(0, connectionsCount || 0);
  if (deg <= 8) {
    return 4.0 + 2.0 * deg;
  }
  return Math.min(26.0, 20.0 + 2.5 * Math.log2(deg - 7));
}

/**
 * Normalizes link endpoint to string ID whether string or mutated node object.
 */
export function getEndpointId(endpoint: string | { id: string } | unknown): string {
  if (typeof endpoint === 'object' && endpoint !== null && 'id' in endpoint) {
    return String((endpoint as { id: string }).id);
  }
  return String(endpoint ?? '');
}

/**
 * Builds undirected adjacency list for fast O(1) neighbor lookups.
 */
export function buildAdjacencyList(graph: GraphData): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }
  for (const link of graph.links) {
    const src = getEndpointId(link.source);
    const tgt = getEndpointId(link.target);
    if (!adj.has(src)) adj.set(src, new Set());
    if (!adj.has(tgt)) adj.set(tgt, new Set());
    adj.get(src)!.add(tgt);
    adj.get(tgt)!.add(src);
  }
  return adj;
}

/**
 * Computes k-hop neighborhood from center node using BFS.
 * Returns a map of Node ID -> hop distance (0 for center, 1 for immediate neighbors, etc.)
 */
export function computeHopNeighborhood(
  centerNodeId: string,
  graph: GraphData,
  maxHops: number,
  adj?: Map<string, Set<string>>
): Map<string, number> {
  const distanceMap = new Map<string, number>();
  if (!centerNodeId) return distanceMap;

  const adjacency = adj || buildAdjacencyList(graph);
  const centerExists = graph.nodes.some((n) => n.id === centerNodeId) || adjacency.has(centerNodeId);
  if (!centerExists) return distanceMap;

  distanceMap.set(centerNodeId, 0);
  if (maxHops <= 0) return distanceMap;

  const queue: [string, number][] = [[centerNodeId, 0]];
  let head = 0;

  while (head < queue.length) {
    const [currentId, dist] = queue[head++];
    if (dist >= maxHops) continue;

    const neighbors = adjacency.get(currentId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!distanceMap.has(neighborId)) {
          distanceMap.set(neighborId, dist + 1);
          queue.push([neighborId, dist + 1]);
        }
      }
    }
  }

  return distanceMap;
}

/**
 * Pure filtering function executing multi-criteria filtering pipeline.
 * Fully compatible with PROJECT.md and E2E Test Suite (T1.27 - T4.03).
 */
export function filterGraph(
  graphData: GraphData,
  options: GraphFilterOptions = {},
  persistentRegistry?: Map<string, SimulationNode>
): FilterResult {
  const {
    searchQuery = '',
    query,
    selectedTags = [],
    tag,
    tagFilterMode = 'any',
    showOrphans,
    hideOrphans,
    showGhostNodes = true,
    hideUnresolved,
    focusedNodeId,
    centerNodeId,
    hopDepth = 0,
  } = options;

  // 1. Resolve option aliases
  const effectiveQuery = (query !== undefined ? query : searchQuery).trim().toLowerCase();
  const effectiveCenterId = centerNodeId !== undefined ? centerNodeId : (focusedNodeId || null);
  const effectiveHideOrphans = hideOrphans !== undefined ? hideOrphans : (showOrphans !== undefined ? !showOrphans : false);
  const effectiveShowGhost = hideUnresolved !== undefined ? !hideUnresolved : showGhostNodes;
  const effectiveHopDepth = hopDepth ?? 0;

  // Normalize tags
  const rawTags = tag !== undefined ? (tag ? [tag] : []) : selectedTags;
  const effectiveTags = rawTags
    .map((t) => t.replace(/^#/, '').toLowerCase().trim())
    .filter((t) => t.length > 0);

  // 2. Build Adjacency and Hop-Neighborhood
  const adj = buildAdjacencyList(graphData);
  let hopDistanceMap = new Map<string, number>();
  let isHopActive = false;

  if (effectiveCenterId && effectiveHopDepth > 0) {
    hopDistanceMap = computeHopNeighborhood(effectiveCenterId, graphData, effectiveHopDepth, adj);
    isHopActive = true;
  }

  // 3. Node Predicate Evaluation
  const survivingNodes: SimulationNode[] = [];
  const matchedNodeIds = new Set<string>();

  for (const rawNode of graphData.nodes) {
    // A. Hop Depth check
    if (isHopActive && !hopDistanceMap.has(rawNode.id)) {
      continue;
    }

    // B. Ghost / Unresolved Node check
    if (!effectiveShowGhost && rawNode.is_unresolved) {
      continue;
    }

    // C. Orphan Node check
    if (effectiveHideOrphans && (rawNode.is_orphan || rawNode.connections_count === 0)) {
      continue;
    }

    // D. Tag Filter check
    if (effectiveTags.length > 0) {
      if (rawNode.is_unresolved || !rawNode.tags || rawNode.tags.length === 0) {
        continue;
      }
      const nodeTagsLower = rawNode.tags.map((t) => t.replace(/^#/, '').toLowerCase().trim());
      const matchesTag = (filterTag: string) =>
        nodeTagsLower.some((nt) => nt === filterTag || nt.startsWith(`${filterTag}/`));

      if (tagFilterMode === 'all') {
        const matchesAll = effectiveTags.every(matchesTag);
        if (!matchesAll) continue;
      } else {
        const matchesAny = effectiveTags.some(matchesTag);
        if (!matchesAny) continue;
      }
    }

    // E. Search Query check
    if (effectiveQuery.length > 0) {
      const titleMatch = rawNode.title.toLowerCase().includes(effectiveQuery);
      const tagMatch = rawNode.tags && rawNode.tags.some((t) => t.toLowerCase().includes(effectiveQuery));
      if (!titleMatch && !tagMatch) {
        continue;
      }
      matchedNodeIds.add(rawNode.id);
    } else {
      matchedNodeIds.add(rawNode.id);
    }

    // Node survives: preserve coordinates from registry if available
    if (persistentRegistry && persistentRegistry.has(rawNode.id)) {
      const regNode = persistentRegistry.get(rawNode.id)!;
      Object.assign(regNode, rawNode);
      survivingNodes.push(regNode);
    } else {
      const nodeInstance: SimulationNode = { ...rawNode };
      if (persistentRegistry) {
        persistentRegistry.set(rawNode.id, nodeInstance);
      }
      survivingNodes.push(nodeInstance);
    }
  }

  // 4. Strict Edge Consistency: prune links where source or target is filtered out
  const survivingNodeIds = new Set(survivingNodes.map((n) => n.id));
  const survivingLinks: GraphLink[] = [];

  for (const link of graphData.links) {
    const srcId = getEndpointId(link.source);
    const tgtId = getEndpointId(link.target);

    if (!effectiveShowGhost && link.is_unresolved) {
      continue;
    }

    if (survivingNodeIds.has(srcId) && survivingNodeIds.has(tgtId)) {
      survivingLinks.push({
        source: srcId,
        target: tgtId,
        is_unresolved: link.is_unresolved,
      });
    }
  }

  return {
    filteredGraph: {
      nodes: survivingNodes,
      links: survivingLinks,
    },
    hopDistanceMap,
    matchedNodeIds,
  };
}

/**
 * Extracts unique tags with frequency counts for filter drawer
 */
export function extractAvailableTags(nodes: GraphNode[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.tags) {
      for (const t of node.tags) {
        const clean = t.replace(/^#/, '').toLowerCase().trim();
        if (clean) {
          counts.set(clean, (counts.get(clean) || 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
