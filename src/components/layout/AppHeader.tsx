import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Network,
  FileText,
  Search,
  Plus,
  PanelRight,
  PanelLeft,
  Palette,
  Upload,
  Download,
  Check,
} from 'lucide-react';
import type { ThemeConfig, BuiltinThemeId } from '../../types/theme';
import { BUILTIN_THEMES, exportThemeToFile, loadThemeFromFile } from '../../lib/theme';

interface AppHeaderProps {
  currentView: 'editor' | 'graph';
  onViewChange: (view: 'editor' | 'graph') => void;
  onNewNote: () => void;
  onOpenQuickSwitcher?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  isGraphDockOpen?: boolean;
  onToggleGraphDock?: () => void;
  currentTheme?: ThemeConfig;
  onSelectTheme?: (theme: ThemeConfig) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  onViewChange,
  onNewNote,
  onOpenQuickSwitcher,
  isSidebarOpen = true,
  onToggleSidebar,
  isInspectorOpen = true,
  onToggleInspector,
  isGraphDockOpen = false,
  onToggleGraphDock,
  currentTheme = BUILTIN_THEMES.dark,
  onSelectTheme,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeFileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelectTheme) {
      try {
        const loaded = await loadThemeFromFile(file);
        onSelectTheme(loaded);
        setIsThemeMenuOpen(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to import theme');
      }
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <header className="h-11 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 flex items-center justify-between select-none shrink-0 z-20">
      {/* Hidden file input for custom theme file import */}
      <input
        ref={themeFileInputRef}
        type="file"
        accept=".json"
        onChange={handleThemeFileImport}
        className="hidden"
        aria-label="Import theme JSON file"
      />

      {/* Brand & Sidebar Toggle */}
      <div className="flex items-center space-x-2 min-w-[180px]">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Collapse Sidebar (Ctrl+B)' : 'Expand Sidebar (Ctrl+B)'}
            className={`p-1.5 rounded-md border transition ${
              isSidebarOpen
                ? 'bg-slate-800 text-cyan-400 border-slate-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-sm shadow-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-slate-100 hidden sm:inline">
            Hoshinote
          </span>
        </div>
      </div>

      {/* Global Quick Switcher Search Bar */}
      <div className="flex-1 max-w-sm mx-3">
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
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 transition" />
          <input
            type="text"
            readOnly
            placeholder="Quick search... (Ctrl+P / Ctrl+K)"
            aria-label="Search notes"
            className="w-full bg-slate-950/60 border border-slate-800 group-hover:border-slate-700 text-xs rounded-md pl-8 pr-14 py-1 text-slate-200 placeholder-slate-500 cursor-pointer focus:outline-none transition"
          />
          <kbd className="hidden md:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 border border-slate-700 font-mono">
            Ctrl+P
          </kbd>
        </div>
      </div>

      {/* Right Controls: Theme Selector, New Note, Integrated Graph Toggle, Inspector Toggle */}
      <div className="flex items-center space-x-1.5">
        {/* Theme Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen((prev) => !prev)}
            title="Change Theme (Dark, Light, Cute or Custom)"
            className="flex items-center space-x-1 px-2 py-1 rounded border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline text-[11px] capitalize">{currentTheme.id}</span>
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Appearance Themes
              </div>

              {(['dark', 'light', 'cute'] as BuiltinThemeId[]).map((themeId) => {
                const item = BUILTIN_THEMES[themeId];
                const isSelected = currentTheme.id === themeId;
                return (
                  <button
                    key={themeId}
                    onClick={() => {
                      if (onSelectTheme) onSelectTheme(item);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-slate-800 transition ${
                      isSelected ? 'text-cyan-400 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-700"
                        style={{ backgroundColor: item.colors.accent }}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}

              <div className="border-t border-slate-800 my-1" />

              {/* Import & Export Custom Theme File */}
              <button
                onClick={() => {
                  themeFileInputRef.current?.click();
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 text-left text-slate-300 hover:bg-slate-800 transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Import Theme File (.json)</span>
              </button>

              <button
                onClick={() => {
                  exportThemeToFile(currentTheme);
                  setIsThemeMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 text-left text-slate-300 hover:bg-slate-800 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Current Theme</span>
              </button>
            </div>
          )}
        </div>

        {/* New Note Button */}
        <button
          onClick={onNewNote}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Note</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* Integrated Graph Panel Toggle (Merged with Editor View) */}
        {onToggleGraphDock && (
          <button
            onClick={onToggleGraphDock}
            title={isGraphDockOpen ? 'Hide Integrated Graph Dock' : 'Show Integrated Graph Dock (Wiki.js style)'}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border transition ${
              isGraphDockOpen
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Graph Dock</span>
          </button>
        )}

        {/* Full View Switcher */}
        <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => onViewChange('editor')}
            title="Note Editor View"
            data-view="editor"
            aria-label="Note Editor View"
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition ${
              currentView === 'editor'
                ? 'bg-slate-800 text-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span className="hidden xl:inline">Editor</span>
          </button>
          <button
            onClick={() => onViewChange('graph')}
            title="Full Interactive Graph Canvas"
            data-view="graph"
            aria-label="Full Interactive Graph Canvas"
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition ${
              currentView === 'graph'
                ? 'bg-slate-800 text-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3 h-3" />
            <span className="hidden xl:inline">Full Graph</span>
          </button>
        </div>

        {/* Inspector Toggle */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            title="Toggle Backlinks & Info Inspector (Ctrl+Shift+B)"
            className={`p-1.5 rounded border transition ${
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
