import React from 'react';
import { Sparkles, Network, FileText, Search, Plus, PanelRight } from 'lucide-react';

interface AppHeaderProps {
  currentView: 'editor' | 'graph';
  onViewChange: (view: 'editor' | 'graph') => void;
  onNewNote: () => void;
  onOpenQuickSwitcher?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  onViewChange,
  onNewNote,
  onOpenQuickSwitcher,
  isInspectorOpen,
  onToggleInspector,
}) => {
  return (
    <header className="h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 flex items-center justify-between select-none shrink-0 z-20">
      {/* Brand & Title */}
      <div className="flex items-center space-x-2 min-w-[200px]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-sm shadow-cyan-500/20">
          <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-slate-100">Hoshinote</span>
          <span className="text-[10px] text-cyan-400 ml-1.5 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 font-mono">
            v0.1.0
          </span>
        </div>
      </div>

      {/* Global Quick Switcher Search Bar */}
      <div className="flex-1 max-w-md mx-4">
        <div
          onClick={onOpenQuickSwitcher}
          className="relative cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onOpenQuickSwitcher) onOpenQuickSwitcher();
            }
          }}
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 transition" />
          <input
            type="text"
            readOnly
            placeholder="Quick open note or search... (Ctrl+P / Ctrl+K)"
            aria-label="Search notes"
            className="w-full bg-slate-950/60 border border-slate-800 group-hover:border-slate-700 text-xs rounded-md pl-9 pr-16 py-1.5 text-slate-200 placeholder-slate-500 cursor-pointer focus:outline-none transition"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700 font-mono">
            Ctrl+P
          </kbd>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onNewNote}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Note</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* View Switcher */}
        <div className="flex bg-slate-950 p-0.5 rounded-md border border-slate-800">
          <button
            onClick={() => onViewChange('editor')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
              currentView === 'editor'
                ? 'bg-slate-800 text-cyan-400 font-medium shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => onViewChange('graph')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition ${
              currentView === 'graph'
                ? 'bg-slate-800 text-cyan-400 font-medium shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Graph</span>
          </button>
        </div>

        {/* Inspector Toggle */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            title="Toggle Backlinks & Info Inspector (Ctrl+Shift+B)"
            className={`p-1.5 rounded-md border transition ${
              isInspectorOpen
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
