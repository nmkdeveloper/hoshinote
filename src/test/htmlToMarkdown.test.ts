import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../lib/htmlToMarkdown';

describe('HTML to Markdown Serializer for In-Place LiveView', () => {
  it('converts headings h1 to h3 correctly', () => {
    const html = '<h1>Main Title</h1><p>Some paragraph text</p><h2>Subtitle</h2>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Main Title');
    expect(md).toContain('Some paragraph text');
    expect(md).toContain('## Subtitle');
  });

  it('converts inline formatting (bold, italic, code)', () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> and <code>code</code>.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
    expect(md).toContain('`code`');
  });

  it('converts list items', () => {
    const html = '<ul><li>First item</li><li>Second item</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('- First item');
    expect(md).toContain('- Second item');
  });

  it('restores MathJax SVGs using data-latex attribute', () => {
    const html = '<p>Energy formula: <svg class="math-inline" data-latex="E = mc^2"><title>E = mc^2</title></svg></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('$E = mc^2$');
  });

  it('restores block MathJax displays using data-latex attribute', () => {
    const html = '<div class="math-display"><svg class="math-block" data-latex="\\int f(x) dx"><title>\\int f(x) dx</title></svg></div>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('$$\n\\int f(x) dx\n$$');
  });

  it('restores embedded graph blocks using data-graph-source attribute', () => {
    const source = 'Frontend -> Backend: IPC';
    const encoded = encodeURIComponent(source);
    const html = `<div class="hoshinote-embedded-graph" data-graph-source="${encoded}"></div>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain('```graph');
    expect(md).toContain('Frontend -> Backend: IPC');
    expect(md).toContain('```');
  });

  it('restores wikilinks using data-target attribute', () => {
    const html = '<p>See <a class="wikilink" data-target="Quantum Physics" href="#">Quantum Physics</a></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[[Quantum Physics]]');
  });
});
