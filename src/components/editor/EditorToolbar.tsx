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
  Sparkles,
  Network,
} from 'lucide-react';
import type { ThemeConfig } from '../../types/theme';

export type ViewMode = 'split' | 'editor' | 'preview' | 'liveview';

export interface EditorToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertFormat: (prefix: string, suffix?: string, defaultText?: string) => void;
  onUploadImage?: (file: File) => void;
  onExportZip?: () => void;
  theme?: ThemeConfig;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onInsertFormat,
  onUploadImage,
  onExportZip,
  theme,
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
    <div
      className="h-8 px-3 border-b flex items-center justify-between text-xs select-none shrink-0 transition-colors duration-150"
      style={{
        backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
        borderColor: theme?.colors.border || 'var(--color-border)',
        color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
      }}
    >
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
      <div className="flex items-center space-x-0.5 overflow-x-auto py-0.5">
        <button
          type="button"
          onClick={() => onInsertFormat('**', '**', 'bold text')}
          title="Bold (**text**)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('*', '*', 'italic text')}
          title="Italic (*text*)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('## ', '', 'Heading')}
          title="Heading (## Heading)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px mx-1" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />

        <button
          type="button"
          onClick={() => onInsertFormat('[[', ']]', 'Note Title')}
          title="Obsidian Wikilink ([[Note]])"
          className="p-1 rounded transition flex items-center font-mono font-semibold text-[11px] hover:opacity-80"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
        >
          <Link className="w-3.5 h-3.5 mr-0.5" />
          <span>[[]]</span>
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('$', '$', 'E = mc^2')}
          title="Inline Math ($formula$)"
          className="p-1 rounded transition flex items-center hover:opacity-80"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
        >
          <Sigma className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('$$\n', '\n$$', '\\int_{a}^{b} f(x) dx')}
          title="Block Math ($$...$$)"
          className="p-1 rounded transition font-mono font-semibold text-[10px] hover:opacity-80"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
        >
          <span>$$</span>
        </button>

        <div className="h-3.5 w-px mx-1" style={{ backgroundColor: theme?.colors.border || 'var(--color-border)' }} />

        {/* Upload Image Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload / Insert Image"
          className="p-1 rounded transition flex items-center gap-1 hover:opacity-80"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
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
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Table className="w-3.5 h-3.5" />
        </button>

        {/* Callout Quote Insert Button */}
        <button
          type="button"
          onClick={() => onInsertFormat('> [!NOTE]\n> ', '', 'Callout content here')}
          title="Insert Callout Blockquote"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('```graph\nFrontend -> Backend: IPC\nBackend -> Database: SQL\n', '\n```', '')}
          title="Insert Graph Block (```graph...```)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.accent || 'var(--color-accent)' }}
        >
          <Network className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('```\n', '\n```', 'code here')}
          title="Code Block (```...```)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onInsertFormat('- [ ] ', '', 'Task')}
          title="Task List (- [ ] Task)"
          className="p-1 rounded transition hover:opacity-80"
          style={{ color: theme?.colors.textPrimary || 'var(--color-text-primary)' }}
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
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] border transition hover:opacity-80"
            style={{
              backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
              color: theme?.colors.textPrimary || 'var(--color-text-primary)',
            }}
          >
            <Download className="w-3 h-3" style={{ color: theme?.colors.accent || 'var(--color-accent)' }} />
            <span className="hidden md:inline">Export ZIP</span>
          </button>
        )}

        <div
          className="flex items-center space-x-0.5 p-0.5 rounded border"
          style={{
            backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
            borderColor: theme?.colors.border || 'var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => onViewModeChange('split')}
            title="Split View (Side by side)"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition"
            style={{
              backgroundColor: viewMode === 'split' ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
              color: viewMode === 'split' ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              fontWeight: viewMode === 'split' ? 600 : 400,
            }}
          >
            <Columns className="w-3 h-3" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('liveview')}
            title="Live View (Single pane, Word-like in-place editing)"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition"
            style={{
              backgroundColor: viewMode === 'liveview' ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
              color: viewMode === 'liveview' ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              fontWeight: viewMode === 'liveview' ? 600 : 400,
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Live</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('editor')}
            title="Editor Only"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition"
            style={{
              backgroundColor: viewMode === 'editor' ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
              color: viewMode === 'editor' ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              fontWeight: viewMode === 'editor' ? 600 : 400,
            }}
          >
            <FileCode className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            title="Preview Only"
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition"
            style={{
              backgroundColor: viewMode === 'preview' ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
              color: viewMode === 'preview' ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              fontWeight: viewMode === 'preview' ? 600 : 400,
            }}
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
