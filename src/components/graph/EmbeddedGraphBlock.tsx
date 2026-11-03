import React, { useRef, useEffect, useState, useMemo } from 'react';
import { parseGraphDsl, ParsedEmbeddedGraph } from '../../lib/graphParser';
import { Network, RotateCcw } from 'lucide-react';

interface EmbeddedGraphBlockProps {
  source: string;
}

interface SimNode {
  id: string;
  label: string;
  degree: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface SimLink {
  source: string;
  target: string;
  label?: string;
}

export const EmbeddedGraphBlock: React.FC<EmbeddedGraphBlockProps> = ({ source }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const graph: ParsedEmbeddedGraph = useMemo(() => {
    return parseGraphDsl(source);
  }, [source]);

  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef<{ type: 'pan' | 'node'; nodeIndex?: number; startX: number; startY: number } | null>(null);

  // Simulation state
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);

  // Initialize simulation nodes with positions
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    const count = graph.nodes.length;

    simNodesRef.current = graph.nodes.map((n, i) => {
      const angle = (i / Math.max(1, count)) * 2 * Math.PI;
      const dist = Math.min(width, height) * 0.28 + (Math.random() - 0.5) * 30;
      return {
        id: n.id,
        label: n.label,
        degree: n.degree,
        color: n.color,
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: Math.max(7, Math.min(18, 7 + n.degree * 2.5)),
      };
    });

    simLinksRef.current = graph.links;
  }, [graph, dimensions.width, dimensions.height]);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height: Math.max(260, Math.min(420, height || 320)) });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation & Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = dimensions.width;
      const height = dimensions.height;
      const nodes = simNodesRef.current;
      const links = simLinksRef.current;

      // Physics step
      const kRepulsion = 1200;
      const kLink = 0.04;
      const targetDist = 90;
      const damping = 0.88;

      // Node-Node repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          const force = kRepulsion / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Link attraction
      const nodeMap = new Map<string, SimNode>();
      for (const n of nodes) nodeMap.set(n.id, n);

      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target && source !== target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = dist - targetDist;
          const fx = (dx / dist) * diff * kLink;
          const fy = (dy / dist) * diff * kLink;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      // Center gravitational pull & position update
      const centerX = width / 2;
      const centerY = height / 2;
      for (let i = 0; i < nodes.length; i++) {
        // Skip updating dragged node
        if (isDraggingRef.current?.type === 'node' && isDraggingRef.current.nodeIndex === i) {
          nodes[i].vx = 0;
          nodes[i].vy = 0;
          continue;
        }

        nodes[i].vx += (centerX - nodes[i].x) * 0.015;
        nodes[i].vy += (centerY - nodes[i].y) * 0.015;

        nodes[i].vx *= damping;
        nodes[i].vy *= damping;

        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
      }

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      const { x: panX, y: panY, scale } = transformRef.current;
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      // Draw Links
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Draw Link label if present
          if (link.label) {
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            ctx.font = '9px sans-serif';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
            ctx.textAlign = 'center';
            ctx.fillText(link.label, midX, midY - 3);
          }
        }
      }

      // Draw Nodes
      for (const node of nodes) {
        // Outer glow / circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 12);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [dimensions.width, dimensions.height]);

  // Mouse handlers for drag/pan/zoom
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.scale;
    const clickY = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.scale;

    // Check if clicked a node
    const nodes = simNodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const dx = nodes[i].x - clickX;
      const dy = nodes[i].y - clickY;
      if (dx * dx + dy * dy <= (nodes[i].radius + 6) ** 2) {
        isDraggingRef.current = { type: 'node', nodeIndex: i, startX: e.clientX, startY: e.clientY };
        return;
      }
    }

    // Otherwise pan background
    isDraggingRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;

    if (isDraggingRef.current.type === 'node') {
      const idx = isDraggingRef.current.nodeIndex!;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.scale;
      const mouseY = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.scale;
      if (simNodesRef.current[idx]) {
        simNodesRef.current[idx].x = mouseX;
        simNodesRef.current[idx].y = mouseY;
      }
    } else if (isDraggingRef.current.type === 'pan') {
      const dx = e.clientX - isDraggingRef.current.startX;
      const dy = e.clientY - isDraggingRef.current.startY;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      isDraggingRef.current.startX = e.clientX;
      isDraggingRef.current.startY = e.clientY;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.4, Math.min(3.0, transformRef.current.scale * zoomFactor));
    transformRef.current.scale = nextScale;
  };

  const handleResetCamera = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
  };

  return (
    <div
      ref={containerRef}
      className="my-4 rounded-xl border border-slate-700/60 bg-slate-900/80 shadow-md overflow-hidden flex flex-col select-none"
    >
      {/* Header Bar */}
      <div className="h-8 px-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">Interactive Graph</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
            {graph.nodes.length} nodes · {graph.links.length} links
          </span>
        </div>
        <button
          onClick={handleResetCamera}
          className="flex items-center space-x-1 hover:text-slate-100 transition px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px]"
          title="Reset camera zoom & position"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Interactive 2D Canvas */}
      <div className="relative w-full h-[320px] bg-slate-950/40">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
};
