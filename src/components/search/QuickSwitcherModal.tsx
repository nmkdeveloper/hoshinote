import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ArrowRight, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { searchNotes, listNotes } from '../../lib/api';
import type { SearchResult, NoteSummary } from '../../types';

export interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
}

export type SwitcherItem =
  | { type: 'search'; item: SearchResult }
  | { type: 'recent'; item: NoteSummary };

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectNote,
  onCreateNote,
}) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SwitcherItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on modal open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search query (150ms) or recent notes when query is empty
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setIsLoading(true);
      listNotes({ limit: 10, is_archived: false, sort_by: 'updated_at', order: 'desc' })
        .then((notes) => {
          setItems(notes.map((n) => ({ type: 'recent', item: n })));
          setSelectedIndex(0);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchNotes(query.trim());
        setItems(results.map((r) => ({ type: 'search', item: r })));
        setSelectedIndex(0);
      } catch (err) {
        console.error('Quick Switcher search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Keep selected item scrolled into view
  useEffect(() => {
    const activeEl = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0 && items[selectedIndex]) {
        onSelectNote(items[selectedIndex].item.id);
        onClose();
      } else if (query.trim() && onCreateNote) {
        onCreateNote(query.trim());
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Switcher"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-100"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Search className="w-5 h-5 mr-3 shrink-0" style={{ color: 'var(--color-accent)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type note title or content... (↑↓ to navigate, ↵ to open)"
            aria-label="Quick search query"
            className="flex-1 bg-transparent border-none text-sm placeholder:opacity-50 focus:outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 opacity-70 hover:opacity-100 transition"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isLoading && (
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ml-2 shrink-0"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No matching notes found</p>
              {query.trim() && onCreateNote && (
                <button
                  onClick={() => {
                    onCreateNote(query.trim());
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-bg-primary)',
                  }}
                >
                  <span>Create "{query.trim()}"</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            items.map((entry, idx) => {
              const isSelected = idx === selectedIndex;
              const title = entry.item.title;
              const snippet = entry.item.snippet;

              return (
                <div
                  key={entry.item.id}
                  onClick={() => {
                    onSelectNote(entry.item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="w-full text-left p-3 rounded-lg transition cursor-pointer flex items-center justify-between gap-3 border"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                    borderColor: isSelected ? 'var(--color-border)' : 'transparent',
                    color: isSelected ? 'var(--color-text-bold)' : 'var(--color-text-primary)',
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate">{title}</span>
                        {entry.type === 'recent' && (
                          <span className="text-[10px] font-mono opacity-60" style={{ color: 'var(--color-text-secondary)' }}>Recent</span>
                        )}
                      </div>
                      {snippet && (
                        <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                          <HighlightedSnippet text={snippet} />
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div
          className="px-4 py-2 border-t text-[10px] flex items-center justify-between font-mono"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>↑↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border)' }}>esc</kbd> close</span>
          </div>
          <div>{items.length} {items.length === 1 ? 'result' : 'results'}</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Safe Snippet Parser (Converts FTS5 <mark> tokens to React Elements)
// ============================================================================

export function HighlightedSnippet({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(<mark>.*?<\/mark>)/gi);
  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          const content = part.slice(6, -7);
          return (
            <mark
              key={index}
              className="bg-neutral-500/25 text-inherit font-semibold px-0.5 rounded border border-neutral-500/40"
            >
              {content}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
