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
import type { ThemeConfig } from '../../types/theme';

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
  theme?: ThemeConfig;
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
  theme,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div
      role="region"
      aria-label="Graph Controls"
      className={`absolute top-4 right-4 z-20 backdrop-blur-md border rounded-2xl shadow-2xl transition-all duration-200 select-none ${
        isCollapsed ? 'w-auto p-2' : 'w-72 p-3.5'
      } ${className}`}
      style={{
        backgroundColor: theme?.colors.bgSecondary ? `${theme.colors.bgSecondary}f2` : 'var(--color-bg-secondary)',
        borderColor: theme?.colors.border || 'var(--color-border)',
        color: theme?.colors.textPrimary || 'var(--color-text-primary)',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <Sliders className="w-4 h-4 shrink-0" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
          {!isCollapsed && (
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-xs font-semibold" style={{ color: theme?.colors.textBold || 'var(--color-text-bold)' }}>
                Graph Controls
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
                  borderColor: theme?.colors.border || 'var(--color-border)',
                  color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
                }}
              >
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
              className="p-1 rounded-md transition hover:opacity-80"
              style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
            >
              <FilterX className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            title={isCollapsed ? 'Expand graph controls' : 'Collapse graph controls'}
            aria-label={isCollapsed ? 'Expand graph controls' : 'Collapse graph controls'}
            className="p-1 rounded-md transition hover:opacity-80"
            style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
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
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search nodes by title..."
              aria-label="Filter title"
              className="w-full border rounded-lg pl-8 pr-7 py-1.5 text-xs focus:outline-none transition"
              style={{
                backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: theme?.colors.textPrimary || 'var(--color-text-primary)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 transition hover:opacity-80"
                style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Hop Depth Neighborhood Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center space-x-1" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
                <Layers className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
                <span>Hop Depth</span>
              </span>
              <span className="font-mono font-medium" style={{ color: theme?.colors.accent || 'var(--color-accent)' }}>
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
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
                accentColor: theme?.colors.accent || 'var(--color-accent)',
              }}
            />
            <div className="flex justify-between text-[9px] px-0.5" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
              <span>All</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
            {focusedNodeTitle && hopDepth > 0 && (
              <div className="text-[10px] truncate mt-0.5" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
                Focus: <span className="font-medium" style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}>{focusedNodeTitle}</span>
              </div>
            )}
          </div>

          {/* Toggles: Orphans & Ghost Nodes */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t" style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}>
            <button
              onClick={onToggleOrphans}
              aria-label="Toggle orphans"
              className="flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] transition"
              style={{
                backgroundColor: showOrphans ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: showOrphans ? (theme?.colors.textBold || 'var(--color-text-bold)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              }}
            >
              <span>Orphans</span>
              {showOrphans ? (
                <Eye className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              ) : (
                <EyeOff className="w-3 h-3 opacity-50" />
              )}
            </button>

            <button
              onClick={onToggleGhostNodes}
              aria-label="Toggle ghost notes"
              className="flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] transition"
              style={{
                backgroundColor: showGhostNodes ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: showGhostNodes ? (theme?.colors.textBold || 'var(--color-text-bold)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              }}
            >
              <span>Ghost Notes</span>
              {showGhostNodes ? (
                <Eye className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              ) : (
                <EyeOff className="w-3 h-3 opacity-50" />
              )}
            </button>
          </div>

          {/* Tag Filter Pills */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}>
              <div className="flex items-center justify-between text-[11px]" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }}>
                <span className="flex items-center space-x-1">
                  <TagIcon className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
                  <span>Filter by Tag</span>
                </span>
                {selectedTags.length > 0 && (
                  <span className="text-[10px] font-medium" style={{ color: theme?.colors.accent || 'var(--color-accent)' }}>
                    {selectedTags.length} active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5 custom-scrollbar">
                {availableTags.map(({ tag, count }) => {
                  const isSelected = selectedTags.includes(tag.toLowerCase());
                  const dotColor = hashTagToColor(tag, theme);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      aria-label={`Tag ${tag}`}
                      className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition"
                      style={{
                        backgroundColor: isSelected
                          ? (theme?.colors.accent || 'var(--color-accent)')
                          : (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)'),
                        borderColor: theme?.colors.border || 'var(--color-border)',
                        color: isSelected
                          ? (theme?.isDark ? '#000000' : '#ffffff')
                          : (theme?.colors.textPrimary || 'var(--color-text-primary)'),
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="truncate max-w-[80px]">#{tag}</span>
                      <span className="text-[9px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Camera View & Physics Action Buttons */}
          <div className="flex items-center space-x-1.5 pt-2 border-t" style={{ borderColor: theme?.colors.border || 'var(--color-border)' }}>
            <button
              onClick={onFitView}
              title="Fit to view"
              aria-label="Fit to view"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg border text-[11px] transition hover:opacity-80"
              style={{
                backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: theme?.colors.textPrimary || 'var(--color-text-primary)',
              }}
            >
              <Maximize2 className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span>Fit View</span>
            </button>

            <button
              onClick={onResetView}
              title="Reset zoom & center"
              aria-label="Reset zoom and center"
              className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg border text-[11px] transition hover:opacity-80"
              style={{
                backgroundColor: theme?.colors.bgTertiary || 'var(--color-bg-tertiary)',
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: theme?.colors.textPrimary || 'var(--color-text-primary)',
              }}
            >
              <RotateCcw className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
              <span>Reset</span>
            </button>

            <button
              onClick={onToggleFreeze}
              title={isPhysicsFrozen ? 'Resume physics simulation' : 'Freeze physics simulation'}
              aria-label={isPhysicsFrozen ? 'Resume physics' : 'Freeze physics'}
              className="p-1.5 rounded-lg border text-[11px] transition hover:opacity-80"
              style={{
                backgroundColor: isPhysicsFrozen
                  ? (theme?.colors.accent || 'var(--color-accent)')
                  : (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)'),
                borderColor: theme?.colors.border || 'var(--color-border)',
                color: isPhysicsFrozen
                  ? (theme?.isDark ? '#000000' : '#ffffff')
                  : (theme?.colors.textPrimary || 'var(--color-text-primary)'),
              }}
            >
              {isPhysicsFrozen ? (
                <Play className="w-3.5 h-3.5" />
              ) : (
                <Pause className="w-3.5 h-3.5" style={{ color: theme?.colors.textSecondary || 'var(--color-text-secondary)' }} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

