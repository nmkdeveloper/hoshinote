import React, { useState } from 'react';
import {
  Search,
  X,
  Sliders,
  ChevronUp,
  ChevronDown,
  Maximize2,
  RotateCcw,
  Play,
  Pause,
  Eye,
  EyeOff,
  Layers,
  Tag as TagIcon,
  FilterX,
} from 'lucide-react';
import { hashTagToColor } from '../../lib/graphFilter';
import type { GraphFilterStats } from '../../hooks/useGraphFilter';

export interface GraphControlsProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Tags
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  availableTags: { tag: string; count: number }[];

  // Toggles
  showOrphans: boolean;
  onToggleOrphans: () => void;
  showGhostNodes: boolean;
  onToggleGhostNodes: () => void;

  // Hop Depth
  hopDepth: number; // 0 = All, 1, 2, 3
  onHopDepthChange: (depth: number) => void;
  focusedNodeTitle?: string | null;

  // Simulation & View
  isPhysicsFrozen: boolean;
  onToggleFreeze: () => void;
  onFitView: () => void;
  onResetView: () => void;

  // Reset & Stats
  onResetFilters: () => void;
  stats: GraphFilterStats;

  // Optional collapsed state
  defaultCollapsed?: boolean;
  className?: string;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  searchQuery,
  onSearchChange,
  selectedTags,
  onToggleTag,
  availableTags,
  showOrphans,
  onToggleOrphans,
  showGhostNodes,
  onToggleGhostNodes,
  hopDepth,
  onHopDepthChange,
  focusedNodeTitle,
  isPhysicsFrozen,
  onToggleFreeze,
  onFitView,
  onResetView,
  onResetFilters,
  stats,
  defaultCollapsed = false,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div
      role="region"
      aria-label="Graph Controls"
      className={`absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl text-slate-200 transition-all duration-200 select-none ${
        isCollapsed ? 'w-auto p-2' : 'w-72 p-3.5'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-xs font-semibold text-slate-100">Graph Controls</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-cyan-300">
                {stats.filteredNodes}/{stats.totalNodes}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {stats.isFiltered && !isCollapsed && (
            <button
              onClick={onResetFilters}
              title="Reset all filters"
              aria-label="Reset filters"
              className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
            >
              <FilterX className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand graph controls' : 'Collapse graph controls'}
            aria-label={isCollapsed ? 'Expand graph controls' : 'Collapse graph controls'}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Body */}
      {!isCollapsed && (
        <div className="mt-3 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search nodes by title..."
              aria-label="Filter title"
              className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Hop Depth Neighborhood Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center space-x-1 text-slate-400">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Hop Depth</span>
              </span>
              <span className="font-mono text-cyan-300 font-medium">
                {hopDepth === 0 ? 'All' : `${hopDepth} Hop${hopDepth > 1 ? 's' : ''}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={hopDepth}
              onChange={(e) => onHopDepthChange(Number(e.target.value))}
              aria-label="Hop depth"
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 px-0.5">
              <span>All</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
            {focusedNodeTitle && hopDepth > 0 && (
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                Focus: <span className="text-slate-200 font-medium">{focusedNodeTitle}</span>
              </div>
            )}
          </div>

          {/* Toggles: Orphans & Ghost Nodes */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/60">
            <button
              onClick={onToggleOrphans}
              aria-label="Toggle orphans"
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] transition ${
                showOrphans
                  ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
              }`}
            >
              <span>Orphans</span>
              {showOrphans ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
            </button>

            <button
              onClick={onToggleGhostNodes}
              aria-label="Toggle ghost notes"
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] transition ${
                showGhostNodes
                  ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
              }`}
            >
              <span>Ghost Notes</span>
              {showGhostNodes ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
            </button>
          </div>

          {/* Tag Filter Pills */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <TagIcon className="w-3 h-3 text-cyan-400" />
                  <span>Filter by Tag</span>
                </span>
                {selectedTags.length > 0 && (
                  <span className="text-[10px] text-cyan-400">{selectedTags.length} active</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5 custom-scrollbar">
                {availableTags.map(({ tag, count }) => {
                  const isSelected = selectedTags.includes(tag.toLowerCase());
                  const dotColor = hashTagToColor(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      aria-label={`Tag ${tag}`}
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/70 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="truncate max-w-[80px]">#{tag}</span>
                      <span className="text-[9px] text-slate-500">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Camera View & Physics Action Buttons */}
          <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-800/60">
            <button
              onClick={onFitView}
              title="Fit to view"
              aria-label="Fit to view"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-200 transition"
            >
              <Maximize2 className="w-3 h-3 text-cyan-400" />
              <span>Fit View</span>
            </button>

            <button
              onClick={onResetView}
              title="Reset zoom & center"
              aria-label="Reset zoom and center"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset</span>
            </button>

            <button
              onClick={onToggleFreeze}
              title={isPhysicsFrozen ? 'Resume physics simulation' : 'Freeze physics simulation'}
              aria-label={isPhysicsFrozen ? 'Resume physics' : 'Freeze physics'}
              className={`p-1.5 rounded-lg border text-[11px] transition ${
                isPhysicsFrozen
                  ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                  : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
              }`}
            >
              {isPhysicsFrozen ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
