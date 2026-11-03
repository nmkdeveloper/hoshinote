import React, { useRef, useState, useMemo } from 'react';
import {
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
import { BUILTIN_THEMES, exportThemeToFile, loadThemeFromFile, getCustomThemes } from '../../lib/theme';

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

  const customThemes = useMemo(() => getCustomThemes(), [isThemeMenuOpen]);

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
    <header
      className="h-10 border-b px-3 flex items-center justify-between select-none shrink-0 z-20 backdrop-blur transition-colors duration-150"
      style={{
        backgroundColor: currentTheme.colors.bgSecondary,
        borderColor: currentTheme.colors.border,
        color: currentTheme.colors.textPrimary,
      }}
    >
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
      <div className="flex items-center space-x-2 min-w-[170px]">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Collapse Sidebar (Ctrl+B)' : 'Expand Sidebar (Ctrl+B)'}
            className="p-1 rounded-md border transition"
            style={{
              backgroundColor: isSidebarOpen ? currentTheme.colors.bgTertiary : currentTheme.colors.bgPrimary,
              borderColor: currentTheme.colors.border,
              color: isSidebarOpen ? currentTheme.colors.accent : currentTheme.colors.textSecondary,
            }}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <img
            src="/logo.png"
            alt="Hoshinote Logo"
            className="w-6 h-6 rounded-md object-cover shadow-xs border border-white/10 shrink-0"
          />
          <span className="font-semibold text-xs tracking-tight hidden sm:inline" style={{ color: currentTheme.colors.textBold }}>
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
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 transition" style={{ color: currentTheme.colors.textSecondary }} />
          <input
            type="text"
            readOnly
            placeholder="Quick search... (Ctrl+P / Ctrl+K)"
            aria-label="Search notes"
            className="w-full border text-xs rounded-md pl-8 pr-14 py-1 cursor-pointer focus:outline-none transition"
            style={{
              backgroundColor: currentTheme.colors.bgPrimary,
              borderColor: currentTheme.colors.border,
              color: currentTheme.colors.textPrimary,
            }}
          />
          <kbd
            className="hidden md:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1 py-0.5 rounded border font-mono"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              borderColor: currentTheme.colors.border,
              color: currentTheme.colors.textSecondary,
            }}
          >
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
            className="flex items-center space-x-1 px-2 py-1 rounded border text-xs transition"
            style={{
              backgroundColor: currentTheme.colors.bgPrimary,
              borderColor: currentTheme.colors.border,
              color: currentTheme.colors.textPrimary,
            }}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.colors.accent }} />
            <span className="hidden md:inline text-[11px] capitalize">{currentTheme.id}</span>
          </button>

          {isThemeMenuOpen && (
            <div
              className="absolute right-0 mt-1.5 w-56 border rounded-lg shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100"
              style={{
                backgroundColor: currentTheme.colors.bgSecondary,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.textPrimary,
              }}
            >
              <div
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b"
                style={{
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.textSecondary,
                }}
              >
                Themes
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
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left transition hover:opacity-80"
                    style={{
                      backgroundColor: isSelected ? currentTheme.colors.bgTertiary : 'transparent',
                      color: isSelected ? currentTheme.colors.accent : currentTheme.colors.textPrimary,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border"
                        style={{
                          backgroundColor: item.colors.accent,
                          borderColor: currentTheme.colors.border,
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}

              {/* Custom Imported Themes */}
              {customThemes.length > 0 && (
                <>
                  <div
                    className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider border-t my-1"
                    style={{
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.textSecondary,
                    }}
                  >
                    Custom Themes
                  </div>
                  {customThemes.map((ct) => {
                    const isSelected = currentTheme.id === ct.id;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => {
                          if (onSelectTheme) onSelectTheme(ct);
                          setIsThemeMenuOpen(false);
                        }}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-left transition hover:opacity-80"
                        style={{
                          backgroundColor: isSelected ? currentTheme.colors.bgTertiary : 'transparent',
                          color: isSelected ? currentTheme.colors.accent : currentTheme.colors.textPrimary,
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full border shrink-0"
                            style={{
                              backgroundColor: ct.colors.accent,
                              borderColor: currentTheme.colors.border,
                            }}
                          />
                          <span className="truncate">{ct.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}

              <div className="border-t my-1" style={{ borderColor: currentTheme.colors.border }} />

              {/* Import & Export Custom Theme File */}
              <button
                onClick={() => {
                  themeFileInputRef.current?.click();
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 text-left transition hover:opacity-80"
                style={{ color: currentTheme.colors.textPrimary }}
              >
                <Upload className="w-3.5 h-3.5" style={{ color: currentTheme.colors.textSecondary }} />
                <span>Import Theme File (.json)</span>
              </button>

              <button
                onClick={() => {
                  exportThemeToFile(currentTheme);
                  setIsThemeMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 flex items-center space-x-2 text-left transition hover:opacity-80"
                style={{ color: currentTheme.colors.textPrimary }}
              >
                <Download className="w-3.5 h-3.5" style={{ color: currentTheme.colors.textSecondary }} />
                <span>Export Current Theme</span>
              </button>
            </div>
          )}
        </div>

        {/* New Note Button */}
        <button
          onClick={onNewNote}
          className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition shadow-xs hover:opacity-90"
          style={{
            backgroundColor: currentTheme.colors.accent,
            color: currentTheme.isDark ? '#000000' : '#ffffff',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Note</span>
        </button>

        <div className="h-4 w-px mx-0.5" style={{ backgroundColor: currentTheme.colors.border }} />

        {/* Integrated Graph Dock Toggle (Wiki.js Style) */}
        {onToggleGraphDock && (
          <button
            onClick={onToggleGraphDock}
            title={isGraphDockOpen ? 'Hide Integrated Graph Dock (Ctrl+G)' : 'Show Integrated Graph Dock (Ctrl+G - Wiki.js style)'}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs border transition"
            style={{
              backgroundColor: isGraphDockOpen ? currentTheme.colors.bgTertiary : currentTheme.colors.bgPrimary,
              borderColor: isGraphDockOpen ? currentTheme.colors.accent : currentTheme.colors.border,
              color: isGraphDockOpen ? currentTheme.colors.accent : currentTheme.colors.textSecondary,
            }}
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Graph Dock</span>
          </button>
        )}

        {/* Full View Switcher */}
        <div
          className="flex p-0.5 rounded border"
          style={{
            backgroundColor: currentTheme.colors.bgPrimary,
            borderColor: currentTheme.colors.border,
          }}
        >
          <button
            onClick={() => onViewChange('editor')}
            title="Note Editor View"
            data-view="editor"
            aria-label="Note Editor View"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition"
            style={{
              backgroundColor: currentView === 'editor' ? currentTheme.colors.bgTertiary : 'transparent',
              color: currentView === 'editor' ? currentTheme.colors.accent : currentTheme.colors.textSecondary,
              fontWeight: currentView === 'editor' ? 600 : 400,
            }}
          >
            <FileText className="w-3 h-3" />
            <span className="hidden xl:inline">Editor</span>
          </button>
          <button
            onClick={() => onViewChange('graph')}
            title="Full Interactive Graph Canvas"
            data-view="graph"
            aria-label="Full Interactive Graph Canvas"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition"
            style={{
              backgroundColor: currentView === 'graph' ? currentTheme.colors.bgTertiary : 'transparent',
              color: currentView === 'graph' ? currentTheme.colors.accent : currentTheme.colors.textSecondary,
              fontWeight: currentView === 'graph' ? 600 : 400,
            }}
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
            className="p-1.5 rounded border transition"
            style={{
              backgroundColor: isInspectorOpen ? currentTheme.colors.bgTertiary : currentTheme.colors.bgPrimary,
              borderColor: isInspectorOpen ? currentTheme.colors.accent : currentTheme.colors.border,
              color: isInspectorOpen ? currentTheme.colors.accent : currentTheme.colors.textSecondary,
            }}
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
