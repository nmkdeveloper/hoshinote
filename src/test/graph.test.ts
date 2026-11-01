import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-force-graph-2d', () => {
  return {
    default: (props: any) =>
      React.createElement('div', {
        'data-testid': 'force-graph-2d',
        'data-nodes': props.graphData?.nodes?.length ?? 0,
        'data-links': props.graphData?.links?.length ?? 0,
        style: { width: props.width, height: props.height },
      }),
  };
});

import { GraphControls } from '../components/graph/GraphControls';
import { GraphView } from '../components/graph/GraphView';
import { useGraphFilter } from '../hooks/useGraphFilter';
import type { GraphData } from '../types';

// Lightweight hook test harness for Node.js / Vitest
function testHook<TProps, TResult>(
  hookFn: (props: TProps) => TResult,
  initialProps: TProps
) {
  let currentProps = initialProps;
  let result = { current: undefined as unknown as TResult };
  let hooks: Array<{ state: any; setState: (s: any) => void }> = [];
  let refs: Array<{ current: any }> = [];
  let effects: Array<{ effect: () => (() => void) | void; deps?: any[]; cleanup?: (() => void) | void }> = [];
  let hookIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;

  function runHook() {
    hookIndex = 0;
    refIndex = 0;
    effectIndex = 0;

    const dispatcher = {
      useState: (initial: any) => {
        const idx = hookIndex++;
        if (hooks[idx] === undefined) {
          hooks[idx] = {
            state: typeof initial === 'function' ? initial() : initial,
            setState: (nextState: any) => {
              hooks[idx].state = typeof nextState === 'function' ? nextState(hooks[idx].state) : nextState;
              runHook();
            },
          };
        }
        return [hooks[idx].state, hooks[idx].setState];
      },
      useRef: (initial: any) => {
        const idx = refIndex++;
        if (refs[idx] === undefined) {
          refs[idx] = { current: initial };
        }
        return refs[idx];
      },
      useCallback: (fn: any) => fn,
      useEffect: (effect: () => (() => void) | void, deps?: any[]) => {
        const idx = effectIndex++;
        const prev = effects[idx];
        const hasChanged = !prev || !deps || !prev.deps || deps.some((d, i) => d !== prev.deps![i]);
        if (hasChanged) {
          if (prev?.cleanup) {
            try { prev.cleanup(); } catch (e) {}
          }
          const cleanup = effect();
          effects[idx] = { effect, deps, cleanup };
        }
      },
      useMemo: (factory: () => any) => factory(),
    };

    const prevDispatcher = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current;
    if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    }

    try {
      result.current = hookFn(currentProps);
    } finally {
      if ((React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prevDispatcher;
      }
    }
  }

  runHook();

  return {
    result,
    rerender: (newProps: TProps) => {
      currentProps = newProps;
      runHook();
    },
  };
}

describe('useGraphFilter React Hook Lifecycle & State Management', () => {
  const sampleGraph: GraphData = {
    nodes: [
      { id: '1', title: 'Note 1', tags: ['#math'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'math' },
      { id: '2', title: 'Note 2', tags: ['#physics'], connections_count: 1, is_orphan: false, is_unresolved: false, group: 'physics' },
      { id: '3', title: 'Orphan Note', tags: [], connections_count: 0, is_orphan: true, is_unresolved: false, group: 'general' },
    ],
    links: [
      { source: '1', target: '2', is_unresolved: false },
    ],
  };

  it('initializes with default filters and emits complete graph', () => {
    const { result } = testHook(useGraphFilter, { rawGraph: sampleGraph });

    expect(result.current.filteredGraph.nodes.length).toBe(3);
    expect(result.current.filteredGraph.links.length).toBe(1);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.selectedTags).toEqual([]);
    expect(result.current.filters.showOrphans).toBe(true);
    expect(result.current.filters.showGhostNodes).toBe(true);
    expect(result.current.filters.hopDepth).toBe(0);
    expect(result.current.stats.totalNodes).toBe(3);
    expect(result.current.stats.isFiltered).toBe(false);
  });

  it('updates filtered output when search query changes', () => {
    const { result } = testHook(useGraphFilter, { rawGraph: sampleGraph });

    result.current.setSearchQuery('Orphan');
    expect(result.current.filteredGraph.nodes.length).toBe(1);
    expect(result.current.filteredGraph.nodes[0].id).toBe('3');
    expect(result.current.stats.isFiltered).toBe(true);
  });

  it('toggles tags on and off and updates filtered graph', () => {
    const { result } = testHook(useGraphFilter, { rawGraph: sampleGraph });

    // Toggle on #math
    result.current.toggleTag('math');
    expect(result.current.filters.selectedTags).toEqual(['math']);
    expect(result.current.filteredGraph.nodes.length).toBe(1);
    expect(result.current.filteredGraph.nodes[0].id).toBe('1');

    // Toggle off #math
    result.current.toggleTag('math');
    expect(result.current.filters.selectedTags).toEqual([]);
    expect(result.current.filteredGraph.nodes.length).toBe(3);
  });

  it('hides orphans and resets filters cleanly', () => {
    const { result } = testHook(useGraphFilter, { rawGraph: sampleGraph });

    result.current.setShowOrphans(false);
    expect(result.current.filteredGraph.nodes.length).toBe(2);
    expect(result.current.filteredGraph.nodes.some((n) => n.id === '3')).toBe(false);

    result.current.resetFilters();
    expect(result.current.filters.showOrphans).toBe(true);
    expect(result.current.filteredGraph.nodes.length).toBe(3);
  });
});

describe('GraphControls Component Rendering & Accessibility', () => {
  const dummyStats = {
    totalNodes: 12,
    totalLinks: 8,
    filteredNodes: 7,
    filteredLinks: 4,
    isFiltered: true,
  };

  const sampleTags = [
    { tag: 'math', count: 4 },
    { tag: 'physics', count: 3 },
  ];

  it('renders full glassmorphism HUD with ARIA roles and labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(GraphControls, {
        searchQuery: 'Calculus',
        onSearchChange: () => {},
        selectedTags: ['math'],
        onToggleTag: () => {},
        availableTags: sampleTags,
        showOrphans: true,
        onToggleOrphans: () => {},
        showGhostNodes: true,
        onToggleGhostNodes: () => {},
        hopDepth: 1,
        onHopDepthChange: () => {},
        focusedNodeTitle: 'Quantum Physics',
        isPhysicsFrozen: false,
        onToggleFreeze: () => {},
        onFitView: () => {},
        onResetView: () => {},
        onResetFilters: () => {},
        stats: dummyStats,
      })
    );

    // Accessibility attributes
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Graph Controls"');
    expect(html).toContain('aria-label="Filter title"');
    expect(html).toContain('aria-label="Hop depth"');
    expect(html).toContain('aria-label="Toggle orphans"');
    expect(html).toContain('aria-label="Toggle ghost notes"');
    expect(html).toContain('aria-label="Fit to view"');
    expect(html).toContain('aria-label="Reset zoom and center"');

    // UI Content
    expect(html).toContain('Graph Controls');
    expect(html).toContain('7/12');
    expect(html).toContain('Quantum Physics');
    expect(html).toContain('#math');
    expect(html).toContain('#physics');
    expect(html).toContain('value="Calculus"');
  });

  it('renders compact collapsed button when defaultCollapsed is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(GraphControls, {
        searchQuery: '',
        onSearchChange: () => {},
        selectedTags: [],
        onToggleTag: () => {},
        availableTags: [],
        showOrphans: true,
        onToggleOrphans: () => {},
        showGhostNodes: true,
        onToggleGhostNodes: () => {},
        hopDepth: 0,
        onHopDepthChange: () => {},
        isPhysicsFrozen: false,
        onToggleFreeze: () => {},
        onFitView: () => {},
        onResetView: () => {},
        onResetFilters: () => {},
        stats: {
          totalNodes: 5,
          totalLinks: 2,
          filteredNodes: 5,
          filteredLinks: 2,
          isFiltered: false,
        },
        defaultCollapsed: true,
      })
    );

    expect(html).toContain('aria-label="Expand graph controls"');
    expect(html).not.toContain('Search nodes by title...');
  });

  it('reflects frozen physics state with play icon button', () => {
    const html = renderToStaticMarkup(
      React.createElement(GraphControls, {
        searchQuery: '',
        onSearchChange: () => {},
        selectedTags: [],
        onToggleTag: () => {},
        availableTags: [],
        showOrphans: true,
        onToggleOrphans: () => {},
        showGhostNodes: true,
        onToggleGhostNodes: () => {},
        hopDepth: 0,
        onHopDepthChange: () => {},
        isPhysicsFrozen: true,
        onToggleFreeze: () => {},
        onFitView: () => {},
        onResetView: () => {},
        onResetFilters: () => {},
        stats: dummyStats,
      })
    );

    expect(html).toContain('aria-label="Resume physics"');
  });
});

describe('GraphView Component Container & Fallbacks', () => {
  it('renders empty vault screen when data has 0 nodes', () => {
    const emptyData: GraphData = { nodes: [], links: [] };

    const html = renderToStaticMarkup(
      React.createElement(GraphView, {
        data: emptyData,
        selectedNoteId: null,
        onSelectNote: () => {},
        onCreateNote: () => {},
      })
    );

    expect(html).toContain('Vault graph is empty');
    expect(html).toContain('Create First Note');
  });

  it('renders filter empty message with reset button when filters exclude all nodes', () => {
    const data: GraphData = {
      nodes: [
        {
          id: 'n1',
          title: 'Eulerian Graph',
          tags: ['#math'],
          connections_count: 0,
          is_orphan: true,
          is_unresolved: false,
          group: 'math',
        },
      ],
      links: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(GraphView, {
        data,
        selectedNoteId: null,
        onSelectNote: () => {},
        onCreateNote: () => {},
      })
    );

    expect(html).toContain('Graph Controls');
    expect(html).toContain('bg-slate-950');
  });
});
