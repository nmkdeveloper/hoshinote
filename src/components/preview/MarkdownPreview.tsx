import React, { useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { parseMarkdownWithMath } from '../../lib/markdown';

export interface MarkdownPreviewHandle {
  scrollToRatio: (ratio: number) => void;
}

export interface MarkdownPreviewProps {
  content: string;
  existingTitles?: string[];
  onNavigateWikilink?: (title: string, heading?: string) => void;
  onScroll?: (ratio: number) => void;
  className?: string;
}

export const MarkdownPreview = forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(
  ({ content, existingTitles = [], onNavigateWikilink, onScroll, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScrollRef = useRef(false);

    // Compile markdown with MathJax SVGs & Wikilinks
    const renderedHtml = useMemo(() => {
      return parseMarkdownWithMath(content, existingTitles);
    }, [content, existingTitles]);

    // Handle Wikilink clicks & Codeblock copy button
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Codeblock copy button
        const copyBtn = target.closest('.codeblock-copy-btn') as HTMLButtonElement | null;
        if (copyBtn) {
          e.preventDefault();
          const wrapper = copyBtn.closest('.codeblock-wrapper');
          const codeEl = wrapper?.querySelector('pre code');
          if (codeEl) {
            const textToCopy = codeEl.textContent || '';
            navigator.clipboard.writeText(textToCopy).catch(() => {});
            const originalText = copyBtn.textContent || 'Copy';
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyBtn.textContent = originalText;
            }, 1800);
          }
          return;
        }

        // Wikilink clicks
        const wikilinkEl = target.closest('a[data-target]') as HTMLAnchorElement | null;
        if (wikilinkEl) {
          e.preventDefault();
          const noteTitle = wikilinkEl.getAttribute('data-target');
          const heading = wikilinkEl.getAttribute('data-heading') || undefined;
          if (noteTitle && onNavigateWikilink) {
            onNavigateWikilink(noteTitle, heading);
          }
        }
      },
      [onNavigateWikilink]
    );

    // Scroll listener for synchronized scrolling
    const handleScroll = useCallback(() => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      const el = containerRef.current;
      if (!el || !onScroll) return;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        const ratio = el.scrollTop / maxScroll;
        onScroll(ratio);
      }
    }, [onScroll]);

    // Expose scroll imperative method
    useImperativeHandle(
      ref,
      () => ({
        scrollToRatio: (ratio: number) => {
          const el = containerRef.current;
          if (!el) return;
          const maxScroll = el.scrollHeight - el.clientHeight;
          if (maxScroll > 0) {
            isProgrammaticScrollRef.current = true;
            el.scrollTop = ratio * maxScroll;
          }
        },
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onClick={handleClick}
        className={`h-full w-full overflow-y-auto px-8 py-6 select-text font-sans leading-relaxed ${className}`}
        style={{
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-bg-editor)',
        }}
      >
        <div
          className="markdown-preview max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    );
  }
);

MarkdownPreview.displayName = 'MarkdownPreview';
