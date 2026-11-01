import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { GraphData } from '../types';
import {
  filterGraph,
  extractAvailableTags,
  type SimulationNode,
  type GraphFilterOptions,
} from '../lib/graphFilter';

export interface UseGraphFilterProps {
  rawGraph: GraphData | null | undefined;
  activeNoteId?: string | null;
  initialHopDepth?: number;
}

export interface GraphFilterStats {
  totalNodes: number;
  totalLinks: number;
  filteredNodes: number;
  filteredLinks: number;
  isFiltered: boolean;
}

export function useGraphFilter({
  rawGraph,
  activeNoteId = null,
  initialHopDepth = 0,
}: UseGraphFilterProps) {
  // State controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any');
  const [showOrphans, setShowOrphans] = useState(true);
  const [showGhostNodes, setShowGhostNodes] = useState(true);
  const [hopDepth, setHopDepth] = useState<number>(initialHopDepth);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(activeNoteId);

  // Sync focused node if active note changes
  useEffect(() => {
    if (activeNoteId) {
      setFocusedNodeId(activeNoteId);
    }
  }, [activeNoteId]);

  // Persistent coordinate and node registry across filter changes
  const registryRef = useRef<Map<string, SimulationNode>>(new Map());

  // Clean stale nodes from registry when rawGraph changes
  useEffect(() => {
    if (!rawGraph) return;
    const currentIds = new Set(rawGraph.nodes.map((n) => n.id));
    for (const key of registryRef.current.keys()) {
      if (!currentIds.has(key)) {
        registryRef.current.delete(key);
      }
    }
  }, [rawGraph]);

  const toggleTag = useCallback((tag: string) => {
    const clean = tag.replace(/^#/, '').toLowerCase().trim();
    setSelectedTags((prev) =>
      prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
    setTagFilterMode('any');
    setShowOrphans(true);
    setShowGhostNodes(true);
    setHopDepth(0);
    setFocusedNodeId(activeNoteId || null);
  }, [activeNoteId]);

  // Pipeline Execution (Memoized)
  const { filteredGraph, hopDistanceMap, matchedNodeIds } = useMemo(() => {
    if (!rawGraph || !rawGraph.nodes) {
      return {
        filteredGraph: { nodes: [], links: [] },
        hopDistanceMap: new Map<string, number>(),
        matchedNodeIds: new Set<string>(),
      };
    }

    const options: GraphFilterOptions = {
      searchQuery,
      selectedTags,
      tagFilterMode,
      showOrphans,
      showGhostNodes,
      focusedNodeId,
      hopDepth,
    };

    return filterGraph(rawGraph, options, registryRef.current);
  }, [
    rawGraph,
    searchQuery,
    selectedTags,
    tagFilterMode,
    showOrphans,
    showGhostNodes,
    focusedNodeId,
    hopDepth,
  ]);

  const availableTags = useMemo(() => {
    return rawGraph ? extractAvailableTags(rawGraph.nodes) : [];
  }, [rawGraph]);

  const stats: GraphFilterStats = useMemo(() => {
    const totalNodes = rawGraph?.nodes.length || 0;
    const totalLinks = rawGraph?.links.length || 0;
    const filteredNodes = filteredGraph.nodes.length;
    const filteredLinks = filteredGraph.links.length;
    const isFiltered =
      searchQuery.trim().length > 0 ||
      selectedTags.length > 0 ||
      !showOrphans ||
      !showGhostNodes ||
      (hopDepth > 0 && !!focusedNodeId);

    return {
      totalNodes,
      totalLinks,
      filteredNodes,
      filteredLinks,
      isFiltered,
    };
  }, [
    rawGraph,
    filteredGraph,
    searchQuery,
    selectedTags,
    showOrphans,
    showGhostNodes,
    hopDepth,
    focusedNodeId,
  ]);

  return {
    filteredGraph,
    stats,
    availableTags,
    hopDistanceMap,
    matchedNodeIds,
    registryRef,
    filters: {
      searchQuery,
      selectedTags,
      tagFilterMode,
      showOrphans,
      showGhostNodes,
      hopDepth,
      focusedNodeId,
    },
    setSearchQuery,
    setSelectedTags,
    toggleTag,
    setTagFilterMode,
    setShowOrphans,
    setShowGhostNodes,
    setHopDepth,
    setFocusedNodeId,
    resetFilters,
  };
}
