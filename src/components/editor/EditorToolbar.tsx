import React from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Link,
  Code,
  CheckSquare,
  Sigma,
  Columns,
  Eye,
  FileCode,
} from 'lucide-react';

export type ViewMode = 'split' | 'editor' | 'preview';

export interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertFormat: (prefix: string, suffix?: string, defaultText?: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onInsertFormat,
}) => {
  return (
    <div className="h-9 px-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
      {/* Markdown & Math formatting buttons */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onInsertFormat('**', '**', 'bold text')}
          title="Bold (**text**)"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('*', '*', 'italic text')}
          title="Italic (*text*)"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('## ', '', 'Heading')}
          title="Heading (## Heading)"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertFormat('[[', ']]', 'Note Title')}
          title="Obsidian Wikilink ([[Note]])"
          className="p-1 rounded hover:bg-slate-800 hover:text-cyan-400 transition flex items-center font-mono font-semibold text-[11px]"
        >
          <Link className="w-3.5 h-3.5 mr-0.5" />
          <span>[[]]</span>
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('$', '$', 'E = mc^2')}
          title="Inline Math ($formula$)"
          className="p-1 rounded hover:bg-slate-800 hover:text-cyan-400 transition flex items-center"
        >
          <Sigma className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('$$\n', '\n$$', '\\int_{a}^{b} f(x) dx')}
          title="Block Math ($$...$$)"
          className="p-1 rounded hover:bg-slate-800 hover:text-cyan-400 transition font-mono font-semibold text-[10px]"
        >
          <span>$$</span>
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => onInsertFormat('```\n', '\n```', 'code here')}
          title="Code Block (```...```)"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('- [ ] ', '', 'Task')}
          title="Task List (- [ ] Task)"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Switcher: Split / Editor / Preview */}
      <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded border border-slate-800">
        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          title="Split View (Side by side)"
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition ${
            viewMode === 'split'
              ? 'bg-slate-800 text-cyan-400 font-medium'
              : 'hover:text-slate-200'
          }`}
        >
          <Columns className="w-3 h-3" />
          <span className="hidden sm:inline">Split</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('editor')}
          title="Editor Only"
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition ${
            viewMode === 'editor'
              ? 'bg-slate-800 text-cyan-400 font-medium'
              : 'hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3 h-3" />
          <span className="hidden sm:inline">Edit</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('preview')}
          title="Preview Only"
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition ${
            viewMode === 'preview'
              ? 'bg-slate-800 text-cyan-400 font-medium'
              : 'hover:text-slate-200'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>
    </div>
  );
};
