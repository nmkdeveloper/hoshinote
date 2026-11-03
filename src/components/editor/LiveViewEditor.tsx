import React, { useRef, useEffect, useCallback } from 'react';
import { parseMarkdownWithMath } from '../../lib/markdown';
import { htmlToMarkdown } from '../../lib/htmlToMarkdown';
import { EmbeddedGraphBlock } from '../graph/EmbeddedGraphBlock';
import type { ThemeConfig } from '../../types/theme';
import { Sparkles, FileText } from 'lucide-react';
import ReactDOM from 'react-dom/client';

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
  const editorSurfaceRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const lastEmittedContentRef = useRef(content);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compile initial HTML from markdown
  const compiledHtml = React.useMemo(() => {
    return parseMarkdownWithMath(content, existingTitles);
  }, [content, existingTitles]);

  // Synchronize incoming content changes ONLY when not currently focused and active
  useEffect(() => {
    const el = editorSurfaceRef.current;
    if (!el) return;

    // If editor has focus and is actively being typed in, do not re-render DOM to preserve caret
    if (document.activeElement === el || isComposingRef.current) {
      return;
    }

    if (el.innerHTML !== compiledHtml) {
      el.innerHTML = compiledHtml;
      hydrateEmbeddedWidgets(el);
    }
  }, [compiledHtml]);

  // Hydrate interactive widgets (embedded graphs and mermaid)
  const hydrateEmbeddedWidgets = useCallback((parent: HTMLElement) => {
    const graphContainers = parent.querySelectorAll<HTMLDivElement>(
      '.hoshinote-embedded-graph, .hoshinote-embedded-mermaid'
    );
    graphContainers.forEach((container) => {
      if (container.getAttribute('data-hydrated') === 'true') return;
      container.setAttribute('data-hydrated', 'true');
      // Make widget itself non-editable so clicking/dragging does not interfere with contenteditable
      container.setAttribute('contenteditable', 'false');

      const encoded =
        container.getAttribute('data-graph-source') ||
        container.getAttribute('data-mermaid-source') ||
        '';
      const source = decodeURIComponent(encoded);

      try {
        const root = ReactDOM.createRoot(container);
        root.render(<EmbeddedGraphBlock source={source} />);
      } catch (_) {}
    });
  }, []);

  // Handle in-place typing inside the rendered preview
  const handleInput = () => {
    const el = editorSurfaceRef.current;
    if (!el) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const newMarkdown = htmlToMarkdown(el.innerHTML);
      if (newMarkdown !== lastEmittedContentRef.current) {
        lastEmittedContentRef.current = newMarkdown;
        onChange(newMarkdown);
      }
    }, 250);
  };

  const handleBlur = () => {
    isComposingRef.current = false;
    const el = editorSurfaceRef.current;
    if (!el) return;

    const finalMarkdown = htmlToMarkdown(el.innerHTML);
    if (finalMarkdown !== lastEmittedContentRef.current) {
      lastEmittedContentRef.current = finalMarkdown;
      onChange(finalMarkdown);
    }
  };

  // Handle wikilink navigation clicks inside editable view
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const wikilink = target.closest('a[data-target]') as HTMLAnchorElement | null;
    if (wikilink && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const noteTitle = wikilink.getAttribute('data-target');
      const heading = wikilink.getAttribute('data-heading') || undefined;
      if (noteTitle && onNavigateWikilink) {
        onNavigateWikilink(noteTitle, heading);
      }
    }
  };

  return (
    <div
      className="flex-1 h-full w-full overflow-y-auto flex flex-col items-center py-8 px-4 select-text transition-colors duration-150"
      style={{
        backgroundColor: theme?.isDark ? '#090d16' : '#f1f5f9',
      }}
    >
      {/* Word-like Centered Document Page */}
      <div
        className="w-full max-w-4xl min-h-[94%] rounded-xl shadow-xl border flex flex-col relative transition-all duration-150 overflow-hidden"
        style={{
          backgroundColor: theme?.colors.bgEditor || 'var(--color-bg-editor)',
          borderColor: theme?.colors.border || 'var(--color-border)',
          color: theme?.colors.textPrimary || 'var(--color-text-primary)',
        }}
      >
        {/* Document Header Bar */}
        <div
          className="h-8 px-4 border-b flex items-center justify-between text-xs select-none shrink-0"
          style={{
            backgroundColor: theme?.colors.bgSecondary || 'var(--color-bg-secondary)',
            borderColor: theme?.colors.border || 'var(--color-border)',
            color: theme?.colors.textSecondary || 'var(--color-text-secondary)',
          }}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-xs tracking-tight" style={{ color: theme?.colors.textBold }}>
              Live Document Surface (Word-style In-Place Editing)
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] opacity-75">
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>Click anywhere to edit directly</span>
          </div>
        </div>

        {/* The Rendered Preview itself is directly ContentEditable */}
        <div
          ref={editorSurfaceRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onClick={handleClick}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
          className="flex-1 w-full p-8 md:p-12 overflow-y-auto focus:outline-none cursor-text markdown-preview leading-relaxed font-sans"
          style={{
            minHeight: '600px',
            color: theme?.colors.textPrimary || 'var(--color-text-primary)',
          }}
        />
      </div>
    </div>
  );
};
