import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { Network, Loader2, RotateCcw } from 'lucide-react';
import type { GraphData, GraphNode } from '../../types';
import type { ThemeConfig } from '../../types/theme';
import * as api from '../../lib/api';
import {
  getNodeColor,
  computeNodeRadius,
  getEndpointId,
  type SimulationNode,
} from '../../lib/graphFilter';
import { useGraphFilter } from '../../hooks/useGraphFilter';
import { GraphControls } from './GraphControls';

export interface GraphViewProps {
  data?: GraphData | null;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onOpenNote?: (noteId: string) => void;
  onCreateNote: (title: string) => void;
  className?: string;
  theme?: ThemeConfig;
}

export const GraphView: React.FC<GraphViewProps> = ({
  data: propData,
  selectedNoteId,
  onSelectNote,
  onOpenNote,
  onCreateNote,
  className = '',
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [internalGraph, setInternalGraph] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isPhysicsFrozen, setIsPhysicsFrozen] = useState(false);

  // Click timing to differentiate single click vs double click
  const lastClickRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });

  // Load graph data internally if propData is not supplied
  const loadGraphData = useCallback(async () => {
    if (propData !== undefined) return;
    setIsLoading(true);
    try {
      const graph = await api.getGraphData();
      setInternalGraph(graph);
    } catch (err) {
      console.error('Failed to load graph data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propData]);

  useEffect(() => {
    if (propData === undefined) {
      loadGraphData();
    }
  }, [loadGraphData, propData]);

  const rawGraph = propData !== undefined ? propData : internalGraph;

  // Coordinate preservation & filtering hook
  const {
    filteredGraph,
    stats,
    availableTags,
    filters,
    setSearchQuery,
    toggleTag,
    setShowOrphans,
    setShowGhostNodes,
    setHopDepth,
    setFocusedNodeId,
    resetFilters,
  } = useGraphFilter({
    rawGraph,
    activeNoteId: selectedNoteId,
    initialHopDepth: 0,
  });

  // Observe container dimensions with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Configure physics forces on mount or reheat
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;

    // Many-Body charge force with degree-proportional repulsion
    fg.d3Force('charge')?.strength((node: any) => {
      const deg = node.connections_count || 0;
      return -120 - Math.min(180, deg * 15);
    }).distanceMin(15).distanceMax(750);

    // Link spring tension adapting to endpoint radii
    fg.d3Force('link')?.distance((link: any) => {
      const r1 = link.source?.radius || 4;
      const r2 = link.target?.radius || 4;
      return 45 + (r1 + r2) * 1.2;
    }).strength(0.45);
  }, [filteredGraph]);

  // Compute 1-hop adjacency set for hovered node
  const highlightedNeighbors = useMemo(() => {
    const neighbors = new Set<string>();
    if (!hoveredNodeId) return neighbors;

    for (const link of filteredGraph.links) {
      const s = getEndpointId(link.source);
      const t = getEndpointId(link.target);
      if (s === hoveredNodeId) neighbors.add(t);
      if (t === hoveredNodeId) neighbors.add(s);
    }
    return neighbors;
  }, [hoveredNodeId, filteredGraph.links]);

  // Handle single vs double click on node
  const handleNodeClick = useCallback(
    (node: any) => {
      const now = Date.now();
      const prev = lastClickRef.current;
      const isDoubleClick = prev.id === node.id && now - prev.time < 320;

      if (isDoubleClick) {
        lastClickRef.current = { id: '', time: 0 };
        if (node.is_unresolved) {
          onCreateNote(node.title);
        } else if (onOpenNote) {
          onOpenNote(node.id);
        } else {
          onSelectNote(node.id);
        }
      } else {
        lastClickRef.current = { id: node.id, time: now };
        onSelectNote(node.id);
        setFocusedNodeId(node.id);
      }
    },
    [onSelectNote, onOpenNote, onCreateNote, setFocusedNodeId]
  );

  // Camera & Physics actions
  const handleFitView = useCallback(() => {
    fgRef.current?.zoomToFit(400, 40);
  }, []);

  const handleResetView = useCallback(() => {
    fgRef.current?.centerAt(0, 0, 400);
    fgRef.current?.zoom(1.0, 400);
  }, []);

  const handleToggleFreeze = useCallback(() => {
    setIsPhysicsFrozen((prev) => {
      const next = !prev;
      if (next) {
        fgRef.current?.pauseAnimation();
      } else {
        fgRef.current?.resumeAnimation();
        fgRef.current?.d3ReheatSimulation();
      }
      return next;
    });
  }, []);

  // Custom Node Canvas Drawing Callback
  const drawNodeCanvas = useCallback(
    (node: SimulationNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = node.radius ?? computeNodeRadius(node.connections_count);

      const isSelected = selectedNoteId === node.id;
      const isHovered = hoveredNodeId === node.id;
      const isHighlighted = isHovered || highlightedNeighbors.has(node.id);
      const isDimmed = hoveredNodeId !== null && !isHighlighted;

      const isDark = theme ? theme.isDark : true;
      const accentColor = theme?.colors.accent || (isDark ? '#ffffff' : '#000000');
      const accentHoverColor = theme?.colors.accentHover || (isDark ? '#e5e5e5' : '#222222');
      const textColor = theme?.colors.textPrimary || (isDark ? '#ffffff' : '#000000');
      const textSecColor = theme?.colors.textSecondary || (isDark ? '#888888' : '#666666');

      ctx.save();

      // Set opacity based on hover state
      if (isDimmed) {
        ctx.globalAlpha = 0.18;
      } else if (node.is_unresolved) {
        ctx.globalAlpha = 0.65;
      } else {
        ctx.globalAlpha = 1.0;
      }

      const color = getNodeColor(node, theme);

      // 1. Draw active selection glow / ring
      if (isSelected) {
        ctx.beginPath();
        const haloRadius = radius + 3.5 / Math.sqrt(globalScale);
        ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2.2 / Math.sqrt(globalScale);
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 2. Draw hover highlight ring
      if (isHovered && !isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2.5 / Math.sqrt(globalScale), 0, 2 * Math.PI);
        ctx.strokeStyle = accentHoverColor;
        ctx.lineWidth = 1.8 / Math.sqrt(globalScale);
        ctx.stroke();
      }

      // 3. Draw node body
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);

      if (node.is_unresolved) {
        // Dashed border for unresolved / phantom notes
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
        ctx.fill();
        ctx.setLineDash([2.5 / Math.sqrt(globalScale), 2.5 / Math.sqrt(globalScale)]);
        ctx.strokeStyle = textSecColor;
        ctx.lineWidth = 1.2 / Math.sqrt(globalScale);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Solid fill for concrete notes
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isHighlighted
          ? (isDark ? '#ffffff' : '#000000')
          : (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)');
        ctx.lineWidth = 0.9 / Math.sqrt(globalScale);
        ctx.stroke();
      }

      // 4. Level-of-Detail (LOD) Label Text Rendering
      const shouldRenderLabel =
        isSelected ||
        isHighlighted ||
        globalScale >= 1.2 ||
        (globalScale >= 0.6 && (node.connections_count ?? 0) >= 2);

      if (shouldRenderLabel && !isDimmed) {
        const fontSize = Math.max(10, 11.5 / globalScale);
        ctx.font = `${fontSize}px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const label =
          node.title.length > 20 && globalScale < 1.0
            ? `${node.title.slice(0, 18)}…`
            : node.title;

        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textY = y + radius + 3 / Math.sqrt(globalScale);

        // Translucent contrast pill behind text
        ctx.fillStyle = isDark ? 'rgba(10, 10, 10, 0.88)' : 'rgba(255, 255, 255, 0.88)';
        ctx.fillRect(
          x - textWidth / 2 - 3 / globalScale,
          textY - 1 / globalScale,
          textWidth + 6 / globalScale,
          fontSize + 2.5 / globalScale
        );

        // Label text fill
        ctx.fillStyle = isHighlighted
          ? (isDark ? '#ffffff' : '#000000')
          : node.is_unresolved
          ? textSecColor
          : textColor;
        ctx.fillText(label, x, textY);
      }

      ctx.restore();
    },
    [selectedNoteId, hoveredNodeId, highlightedNeighbors, theme]
  );

  // Custom Link Canvas Drawing Callback
  const drawLinkCanvas = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);
      const sx = link.source?.x;
      const sy = link.source?.y;
      const tx = link.target?.x;
      const ty = link.target?.y;

      if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) {
        return;
      }

      const isConnectedToHovered =
        hoveredNodeId !== null &&
        (hoveredNodeId === sourceId || hoveredNodeId === targetId);
      const isDimmed = hoveredNodeId !== null && !isConnectedToHovered;

      const isDark = theme ? theme.isDark : true;
      const accentColor = theme?.colors.accent || (isDark ? '#ffffff' : '#000000');

      ctx.save();

      // Opacity dimming
      if (isDimmed) {
        ctx.globalAlpha = 0.06;
      } else if (isConnectedToHovered) {
        ctx.globalAlpha = 0.90;
      } else if (link.is_unresolved) {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 0.40;
      }

      // Draw link line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);

      let strokeColor = isDark ? '#444444' : '#cccccc';
      let strokeWidth = 1.0 / Math.cbrt(globalScale);

      if (link.is_unresolved) {
        ctx.setLineDash([3 / Math.sqrt(globalScale), 3 / Math.sqrt(globalScale)]);
        strokeColor = isDark ? '#333333' : '#d0d0d0';
        strokeWidth = 0.9 / Math.cbrt(globalScale);
      } else if (isConnectedToHovered) {
        ctx.setLineDash([]);
        strokeColor = accentColor;
        strokeWidth = 1.8 / Math.cbrt(globalScale);
      } else {
        ctx.setLineDash([]);
        strokeColor = isDark ? '#444444' : '#cccccc';
        strokeWidth = 1.0 / Math.cbrt(globalScale);
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Draw directional arrowhead pointing toward target node
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy);

      if (len > 8) {
        const targetRadius = link.target?.radius || 4;
        const arrowDist = Math.max(0, len - targetRadius - 3 / Math.sqrt(globalScale));
        const rel = arrowDist / len;
        const ax = sx + dx * rel;
        const ay = sy + dy * rel;
        const angle = Math.atan2(dy, dx);
        const arrowLength = Math.max(3.0, 4.0 / Math.sqrt(globalScale));
        const arrowWidth = arrowLength * 0.55;

        ctx.setLineDash([]);
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowLength, -arrowWidth);
        ctx.lineTo(-arrowLength, arrowWidth);
        ctx.closePath();
        ctx.fillStyle = strokeColor;
        ctx.fill();
      }

      ctx.setLineDash([]);
      ctx.restore();
    },
    [hoveredNodeId, theme]
  );

  const focusedTitle = useMemo(() => {
    if (!filters.focusedNodeId || !rawGraph) return null;
    const n = rawGraph.nodes.find((item) => item.id === filters.focusedNodeId);
    return n ? n.title : null;
  }, [filters.focusedNodeId, rawGraph]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 select-none ${className}`}
      style={{
        backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
        color: theme?.colors.textPrimary || 'var(--color-text-primary)',
      }}
    >
      {/* Loading state indicator */}
      {isLoading && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: theme?.colors.bgPrimary ? `${theme.colors.bgPrimary}cc` : 'rgba(10, 10, 10, 0.8)' }}
        >
          <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
          <p className="text-xs" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
            Constructing interactive graph...
          </p>
        </div>
      )}

      {/* Floating Graph Controls HUD */}
      <GraphControls
        searchQuery={filters.searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={filters.selectedTags}
        onToggleTag={toggleTag}
        availableTags={availableTags}
        showOrphans={filters.showOrphans}
        onToggleOrphans={() => setShowOrphans((prev) => !prev)}
        showGhostNodes={filters.showGhostNodes}
        onToggleGhostNodes={() => setShowGhostNodes((prev) => !prev)}
        hopDepth={filters.hopDepth}
        onHopDepthChange={setHopDepth}
        focusedNodeTitle={focusedTitle}
        isPhysicsFrozen={isPhysicsFrozen}
        onToggleFreeze={handleToggleFreeze}
        onFitView={handleFitView}
        onResetView={handleResetView}
        onResetFilters={resetFilters}
        stats={stats}
        theme={theme}
      />

      {/* Empty vault state */}
      {!isLoading && rawGraph && rawGraph.nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
          <div
            className="w-14 h-14 rounded-2xl border flex items-center justify-center mb-3"
            style={{
              backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
              color: theme?.colors.accent || 'var(--color-accent)',
            }}
          >
            <Network className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>
            Vault graph is empty
          </h3>
          <p className="text-xs text-center max-w-sm mb-4" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
            Create your first notes and connect them using <code className="font-semibold underline">[[wikilinks]]</code> to visualize your knowledge web.
          </p>
          <button
            onClick={() => onCreateNote('Welcome')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-90 shadow-xs"
            style={{
              backgroundColor: theme?.colors.accent || 'var(--color-accent)',
              color: theme?.isDark ? '#000000' : '#ffffff',
            }}
          >
            Create First Note
          </button>
        </div>
      )}

      {/* Empty filter results state */}
      {!isLoading && rawGraph && rawGraph.nodes.length > 0 && filteredGraph.nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center mb-3"
            style={{
              backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
              color: theme?.colors.accent || 'var(--color-accent)',
            }}
          >
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>
            No notes match current filters
          </h3>
          <p className="text-xs text-center max-w-xs mb-3" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
            Try adjusting your search query, tag filters, or hop depth.
          </p>
          <button
            onClick={resetFilters}
            className="px-3 py-1 rounded-md border text-xs font-medium transition hover:opacity-80"
            style={{
              backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
              color: theme?.colors.textPrimary || 'var(--color-text-primary)',
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Interactive 2D Force-Directed Canvas */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={theme?.colors.bgPrimary || (theme?.isDark ? '#0a0a0a' : '#ffffff')}
          graphData={filteredGraph}
          nodeId="id"
          nodeCanvasObject={(node, ctx, scale) => drawNodeCanvas(node as SimulationNode, ctx, scale)}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            const r = node.radius ?? computeNodeRadius(node.connections_count);
            ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkCanvasObject={(link, ctx, scale) => drawLinkCanvas(link, ctx, scale)}
          onNodeClick={handleNodeClick}
          onNodeHover={(node) => setHoveredNodeId(node ? String((node as GraphNode).id) : null)}
          warmupTicks={60}
          cooldownTicks={180}
          d3AlphaDecay={0.022}
          d3VelocityDecay={0.45}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      )}
    </div>
  );
};

export default GraphView;
