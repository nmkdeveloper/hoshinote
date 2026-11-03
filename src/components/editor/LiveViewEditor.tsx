import React, { useState, useRef, useEffect } from 'react';
import { NoteEditor, NoteEditorHandle } from './NoteEditor';
import { MarkdownPreview, MarkdownPreviewHandle } from '../preview/MarkdownPreview';
import type { ThemeConfig } from '../../types/theme';
import { PenLine, Eye, Sparkles } from 'lucide-react';

export interface LiveViewEditorProps {
  content: string;
  onChange: (value: string) => void;
  existingTitles?: string[];
  onNavigateWikilink?: (title: string, heading?: string) => void;
  theme?: ThemeConfig;
}

export const LiveViewEditor: React.FC<LiveViewEditorProps> = ({
  content,
  onChange,
  existingTitles = [],
  onNavigateWikilink,
  theme,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<NoteEditorHandle>(null);
  const previewRef = useRef<MarkdownPreviewHandle>(null);

  // Focus editor when switching to edit mode
  useEffect(() => {
    if (isEditing) {
      editorRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <div
      className="flex-1 h-full w-full overflow-y-auto flex flex-col items-center py-6 px-4 select-text transition-colors duration-150"
      style={{
        backgroundColor: theme?.isDark ? '#090d16' : '#f1f5f9',
      }}
    >
      {/* Word-like Centered Document Page */}
      <div
        className="w-full max-w-4xl min-h-[92%] rounded-xl shadow-lg border flex flex-col relative transition-all duration-150 overflow-hidden"
        style={{
          backgroundColor: theme?.colors.bgEditor || 'var(--color-bg-editor)',
          borderColor: theme?.colors.border || 'var(--color-border)',
          color: theme?.colors.textPrimary || 'var(--color-text-primary)',
        }}
      >
        {/* Document Top Bar with Word-like Status and Quick In-Place Switcher */}
        <div
          className="h-9 px-4 border-b flex items-center justify-between text-xs select-none shrink-0"
          style={{
            backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
            borderColor: theme?.colors.border || 'var(--color-border)',
            color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
          }}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-xs tracking-tight" style={{ color: theme?.colors.textBold }}>
              Live Document View (Single Pane)
            </span>
          </div>

          <div
            className="flex items-center p-0.5 rounded border"
            style={{
              backgroundColor: theme?.colors.bgPrimary || 'var(--color-bg-primary)',
              borderColor: theme?.colors.border || 'var(--color-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] transition font-medium"
              style={{
                backgroundColor: !isEditing ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
                color: !isEditing ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              }}
            >
              <Eye className="w-3 h-3" />
              <span>Formatted</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] transition font-medium"
              style={{
                backgroundColor: isEditing ? (theme?.colors.bgTertiary || 'var(--color-bg-tertiary)') : 'transparent',
                color: isEditing ? (theme?.colors.accent || 'var(--color-accent)') : (theme?.colors.textSecondary || 'var(--color-text-secondary)'),
              }}
            >
              <PenLine className="w-3 h-3" />
              <span>Direct Edit</span>
            </button>
          </div>
        </div>

        {/* Unified Single Pane Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isEditing ? (
            <div className="flex-1 h-full overflow-hidden flex flex-col p-4">
              <NoteEditor
                ref={editorRef}
                value={content}
                onChange={onChange}
                theme={theme}
              />
            </div>
          ) : (
            <div
              className="flex-1 h-full overflow-y-auto cursor-text"
              onDoubleClick={() => setIsEditing(true)}
              title="Double click to edit directly"
            >
              <MarkdownPreview
                ref={previewRef}
                content={content}
                existingTitles={existingTitles}
                onNavigateWikilink={onNavigateWikilink}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
