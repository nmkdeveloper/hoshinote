import { describe, it, expect } from 'vitest';
import { BUILTIN_THEMES, applyTheme } from '../lib/theme';
import { renderMarkdown, parseMarkdownWithMath } from '../lib/markdown';
import { exportNoteToZip } from '../lib/export';
import type { NoteWithDetails } from '../types';

describe('Themes & Appearance (Dark, Light, Cute)', () => {
  it('contains dark, light, and cute built-in theme definitions', () => {
    expect(BUILTIN_THEMES.dark).toBeDefined();
    expect(BUILTIN_THEMES.light).toBeDefined();
    expect(BUILTIN_THEMES.cute).toBeDefined();

    expect(BUILTIN_THEMES.dark.isDark).toBe(true);
    expect(BUILTIN_THEMES.light.isDark).toBe(false);
    expect(BUILTIN_THEMES.cute.isDark).toBe(false);

    expect(BUILTIN_THEMES.cute.colors.accent).toBe('#ec4899');
    expect(BUILTIN_THEMES.cute.colors.bgPrimary).toBe('#faf5f8');
    expect(BUILTIN_THEMES.cute.colors.border).toBe('#f5d0e3');

    // Monochrome Dark
    expect(BUILTIN_THEMES.dark.colors.accent).toBe('#e5e5e5');
    expect(BUILTIN_THEMES.dark.colors.bgPrimary).toBe('#0a0a0a');
    expect(BUILTIN_THEMES.dark.colors.bgSecondary).toBe('#121212');
    expect(BUILTIN_THEMES.dark.colors.border).toBe('#2e2e2e');
    expect(BUILTIN_THEMES.dark.colors.textPrimary).toBe('#ffffff');

    // Monochrome Light
    expect(BUILTIN_THEMES.light.colors.accent).toBe('#171717');
    expect(BUILTIN_THEMES.light.colors.bgPrimary).toBe('#ffffff');
    expect(BUILTIN_THEMES.light.colors.border).toBe('#d0d0d0');
    expect(BUILTIN_THEMES.light.colors.textPrimary).toBe('#000000');
  });

  it('applies theme variables when document is present', () => {
    const properties = new Map<string, string>();
    const classList = new Set<string>();

    const mockElement = {
      style: {
        setProperty: (k: string, v: string) => properties.set(k, v),
        getPropertyValue: (k: string) => properties.get(k) || '',
      },
      classList: {
        add: (c: string) => classList.add(c),
        remove: (c: string) => classList.delete(c),
        contains: (c: string) => classList.has(c),
      },
    };

    (globalThis as any).document = {
      documentElement: mockElement,
    };

    try {
      applyTheme(BUILTIN_THEMES.cute);
      expect(properties.get('--color-accent')).toBe('#ec4899');
      expect(classList.has('light')).toBe(true);
      expect(classList.has('dark')).toBe(false);

      applyTheme(BUILTIN_THEMES.dark);
      expect(properties.get('--color-accent')).toBe('#e5e5e5');
      expect(properties.get('--color-bg-primary')).toBe('#0a0a0a');
      expect(classList.has('dark')).toBe(true);
      expect(classList.has('light')).toBe(false);

      applyTheme(BUILTIN_THEMES.light);
      expect(properties.get('--color-accent')).toBe('#171717');
      expect(properties.get('--color-bg-primary')).toBe('#ffffff');
      expect(classList.has('dark')).toBe(false);
      expect(classList.has('light')).toBe(true);
    } finally {
      delete (globalThis as any).document;
    }
  });
});

describe('Image and Code Block Rendering', () => {
  it('renders markdown images with alt text and lazy loading', () => {
    const md = '![Diagram](https://example.com/diagram.png)';
    const html = renderMarkdown(md);
    expect(html).toContain('<img src="https://example.com/diagram.png" alt="Diagram" loading="lazy" />');
  });

  it('renders code block with header, language badge, and copy button', () => {
    const md = '```rust\nfn main() {\n    println!("Hello");\n}\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('class="codeblock-wrapper"');
    expect(html).toContain('class="codeblock-header"');
    expect(html).toContain('class="codeblock-lang">RUST</span>');
    expect(html).toContain('class="codeblock-copy-btn"');
    expect(html).toContain('<pre><code class="language-rust">');
  });

  it('renders headings with standard HTML tags for CSS scaling', () => {
    const md = '# Title 1\n## Title 2\n### Title 3';
    const html = parseMarkdownWithMath(md);
    expect(html).toContain('<h1>Title 1</h1>');
    expect(html).toContain('<h2>Title 2</h2>');
    expect(html).toContain('<h3>Title 3</h3>');
  });

  it('renders bold text with strong tags for both asterisks and underscores', () => {
    const md1 = 'This is **extra bold** text';
    const html1 = renderMarkdown(md1);
    expect(html1).toContain('<strong>extra bold</strong>');

    const md2 = 'This is __underscore bold__ text';
    const html2 = renderMarkdown(md2);
    expect(html2).toContain('<strong>underscore bold</strong>');
  });

  it('renders syntax highlighting tokens in fenced code blocks', () => {
    const md = '```javascript\nconst count = 10; // active count\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('class="token-keyword">const</span>');
    expect(html).toContain('class="token-number">10</span>');
    expect(html).toContain('class="token-comment">// active count</span>');
  });
});

describe('Single Note ZIP Export', () => {
  it('packages note markdown and metadata into a valid ZIP blob', async () => {
    const mockNoteDetails: NoteWithDetails = {
      note: {
        id: 'test-note-1',
        title: 'Quantum Computing Fundamentals',
        content: '# Quantum Computing\n\n![Graph](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)\n\nSee [[Welcome to Hoshinote]].',
        path: '/Quantum Computing Fundamentals.md',
        created_at: '2026-11-01T00:00:00.000Z',
        updated_at: '2026-11-01T00:00:00.000Z',
        is_pinned: true,
        is_archived: false,
      },
      tags: ['quantum', 'physics'],
      outgoing_links: [
        {
          id: 'l1',
          source_id: 'test-note-1',
          raw_target: 'Welcome to Hoshinote',
          is_unresolved: false,
        },
      ],
      incoming_links: [],
    };

    const blob = await exportNoteToZip(mockNoteDetails);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(100);
  });
});
