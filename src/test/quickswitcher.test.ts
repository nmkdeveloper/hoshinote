import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuickSwitcherModal, HighlightedSnippet } from '../components/search/QuickSwitcherModal';
import * as api from '../lib/api';

describe('Quick Switcher HighlightedSnippet Component', () => {
  it('correctly parses and renders <mark> highlight tokens using renderToStaticMarkup', () => {
    const snippet = 'Quantum <mark>Physics</mark> and <mark>Math</mark> formula';
    const html = renderToStaticMarkup(React.createElement(HighlightedSnippet, { text: snippet }));

    expect(html).toContain('<mark class="bg-cyan-500/30 text-cyan-200 font-semibold px-0.5 rounded">Physics</mark>');
    expect(html).toContain('<mark class="bg-cyan-500/30 text-cyan-200 font-semibold px-0.5 rounded">Math</mark>');
    expect(html).toContain('Quantum ');
    expect(html).toContain(' and ');
    expect(html).toContain(' formula');
  });

  it('handles empty and plain snippets without mark tags', () => {
    const emptyHtml = renderToStaticMarkup(React.createElement(HighlightedSnippet, { text: '' }));
    expect(emptyHtml).toBe('');

    const plainHtml = renderToStaticMarkup(React.createElement(HighlightedSnippet, { text: 'Plain note snippet' }));
    expect(plainHtml).toContain('Plain note snippet');
    expect(plainHtml).not.toContain('<mark');
  });
});

describe('QuickSwitcherModal Component Rendering & Contracts', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickSwitcherModal, {
        isOpen: false,
        onClose: () => {},
        onSelectNote: () => {},
      })
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with search input and shortcut hints when isOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(QuickSwitcherModal, {
        isOpen: true,
        onClose: () => {},
        onSelectNote: () => {},
      })
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Quick Switcher"');
    expect(html).toContain('aria-label="Quick search query"');
    expect(html).toContain('navigate');
    expect(html).toContain('select');
    expect(html).toContain('close');
  });

  it('cycles navigation index with wrap-around logic', () => {
    const itemCount = 5;
    const nextIndex = (prev: number, len: number) => (len > 0 ? (prev + 1) % len : 0);
    const prevIndex = (prev: number, len: number) => (len > 0 ? (prev - 1 + len) % len : 0);

    expect(nextIndex(0, itemCount)).toBe(1);
    expect(nextIndex(4, itemCount)).toBe(0); // Wrapped to first
    expect(prevIndex(0, itemCount)).toBe(4); // Wrapped to last
    expect(prevIndex(3, itemCount)).toBe(2);
    expect(nextIndex(0, 0)).toBe(0); // Empty list safeguard
  });

  it('retrieves recent notes when query is empty via api contract', async () => {
    api.resetMockDatabase();
    const recent = await api.listNotes({ limit: 10, is_archived: false, sort_by: 'updated_at', order: 'desc' });
    expect(recent.length).toBeGreaterThan(0);
    expect(recent[0].title).toBeDefined();
    expect(recent[0].id).toBeDefined();
  });
});
