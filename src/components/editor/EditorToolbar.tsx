import React, { useRef } from 'react';
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
  Image as ImageIcon,
  Table,
  Quote,
  Download,
} from 'lucide-react';

export type ViewMode = 'split' | 'editor' | 'preview';

export interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertFormat: (prefix: string, suffix?: string, defaultText?: string) => void;
  onUploadImage?: (file: File) => void;
  onExportZip?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onInsertFormat,
  onUploadImage,
  onExportZip,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="h-9 px-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload Image"
      />

      {/* Markdown, Math, Image & Elements formatting buttons */}
      <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
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

        {/* Upload Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload / Insert Image"
          className="p-1 rounded hover:bg-slate-800 hover:text-cyan-400 transition flex items-center gap-1"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        {/* Table Insert Button */}
        <button
          type="button"
          onClick={() =>
            onInsertFormat(
              '\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n',
              '',
              ''
            )
          }
          title="Insert Table"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Table className="w-3.5 h-3.5" />
        </button>

        {/* Callout Quote Insert Button */}
        <button
          type="button"
          onClick={() => onInsertFormat('> [!NOTE]\n> ', '', 'Callout content here')}
          title="Insert Callout Blockquote"
          className="p-1 rounded hover:bg-slate-800 hover:text-slate-100 transition"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

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

      {/* Right Action Controls: Export ZIP + View Mode Switcher */}
      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
        {onExportZip && (
          <button
            type="button"
            onClick={onExportZip}
            title="Export this note as a ZIP archive (with markdown and images)"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Export ZIP</span>
          </button>
        )}

        <div className="flex items-center space-x-0.5 bg-slate-900/90 p-0.5 rounded border border-slate-800">
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
    </div>
  );
};
