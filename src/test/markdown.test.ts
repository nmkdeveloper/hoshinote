import { describe, it, expect } from 'vitest';
import { renderMathToSvg, validateLatex } from '../lib/math';
import { extractWikilinks, parseWikilinkInner, renderWikilinksToHtml } from '../lib/remark-wikilink';
import { renderMarkdown, parseMarkdownWithMath } from '../lib/markdown';

describe('MathJax Formula Renderer (Vector SVG)', () => {
  it('renders inline math to pure scalable SVG', () => {
    const svg = renderMathToSvg('E = mc^2', false);
    expect(svg).toContain('<svg class="math-inline"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('E = mc^2');
  });

  it('renders display block math to container with svg.math-block', () => {
    const html = renderMathToSvg('\\int_{a}^{b} f(x) dx', true);
    expect(html).toContain('<div class="math-display">');
    expect(html).toContain('<svg class="math-block"');
    expect(html).toContain('\\int_{a}^{b} f(x) dx');
  });

  it('detects syntax errors in unbalanced braces and renders error indicator', () => {
    const broken = '\\frac{a}{b';
    const validation = validateLatex(broken);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Unbalanced braces');

    const html = renderMathToSvg(broken, false);
    expect(html).toContain('class="math-error"');
    expect(html).toContain('data-error=');
    expect(html).toContain('Unbalanced braces');
  });

  it('handles empty math strings safely by returning empty string', () => {
    expect(renderMathToSvg('', false)).toBe('');
    expect(renderMathToSvg('   ', true)).toBe('');
  });

  it('renders complex Greek symbols and fractions without error', () => {
    const latex = '\\frac{\\alpha + \\beta}{\\sqrt{\\gamma}}';
    const svg = renderMathToSvg(latex, false);
    expect(svg).toContain('<svg class="math-inline"');
    expect(svg).toContain('\\frac{\\alpha + \\beta}{\\sqrt{\\gamma}}');
  });

  it('renders deeply nested fractions with valid SVG viewBox', () => {
    const deep = '\\frac{1}{\\frac{2}{\\frac{3}{4}}}';
    const html = renderMathToSvg(deep, true);
    expect(html).toContain('<div class="math-display">');
    expect(html).toContain('viewBox=');
  });
});

describe('Currency Protection and Escaping', () => {
  it('differentiates currency numbers from LaTeX formulas ($100 and $200)', () => {
    const text = 'The equipment costs $100 and software is $200 in total.';
    const rendered = parseMarkdownWithMath(text);
    expect(rendered).not.toContain('<svg class="math-inline"');
    expect(rendered).toContain('$100');
    expect(rendered).toContain('$200');
  });

  it('renders escaped dollar signs \\$50 as literal $50 without backslash', () => {
    const text = 'Special offer: \\$50 only.';
    const rendered = parseMarkdownWithMath(text);
    expect(rendered).toContain('$50');
    expect(rendered).not.toContain('\\$50');
  });

  it('correctly handles mixed currency and math in a single document', () => {
    const mixed = 'Price is $1500 and license is $200. Total formula: $C = C_1 + C_2$.';
    const rendered = parseMarkdownWithMath(mixed);
    expect(rendered).toContain('$1500');
    expect(rendered).toContain('$200');
    expect(rendered).toContain('<svg class="math-inline"');
    expect(rendered).toContain('C = C_1 + C_2');
  });

  it('preserves currency ranges ($100-$50, $1-$2, $50/$100) without breaking into math', () => {
    const rangeText = 'Budget is $100-$50 and unit cost is $1-$2 or $50/$100.';
    const rendered = parseMarkdownWithMath(rangeText);
    expect(rendered).not.toContain('<svg class="math-inline"');
    expect(rendered).toContain('$100-$50');
    expect(rendered).toContain('$1-$2');
    expect(rendered).toContain('$50/$100');
  });

  it('renders inline math with leading numbers as MathJax SVG ($2 \\times 2$, $10^{-5}$, $3.14 \\text{ rad}$)', () => {
    const mathText = 'For a $2 \\times 2$ invertible matrix, where $10^{-5}$ is epsilon and $\\theta = 3.14 \\text{ rad}$, $2 + 2 = 4$.';
    const rendered = parseMarkdownWithMath(mathText);
    expect(rendered).toContain('<svg class="math-inline"');
    expect(rendered).toContain('2 \\times 2');
    expect(rendered).toContain('10^{-5}');
    expect(rendered).toContain('3.14 \\text{ rad}');
    expect(rendered).toContain('2 + 2 = 4');
    expect(rendered).not.toContain('$2');
  });

  it('renders mixed currency and leading-number math accurately in the same sentence', () => {
    const mixed = 'For a $2 \\times 2$ matrix book priced at $50-$60, total is $50.';
    const rendered = parseMarkdownWithMath(mixed);
    expect(rendered).toContain('<svg class="math-inline"');
    expect(rendered).toContain('2 \\times 2');
    expect(rendered).toContain('$50-$60');
    expect(rendered).toContain('$50');
  });
});

describe('Obsidian Wikilinks Parser & Resolver', () => {
  it('parses target, alias, and heading correctly', () => {
    expect(parseWikilinkInner('Quantum Physics')).toEqual({
      target: 'Quantum Physics',
      alias: null,
      heading: null,
      displayText: 'Quantum Physics',
    });

    expect(parseWikilinkInner('Quantum Physics|QP')).toEqual({
      target: 'Quantum Physics',
      alias: 'QP',
      heading: null,
      displayText: 'QP',
    });

    expect(parseWikilinkInner('Quantum Physics#Schrodinger')).toEqual({
      target: 'Quantum Physics',
      alias: null,
      heading: 'Schrodinger',
      displayText: 'Quantum Physics > Schrodinger',
    });

    expect(parseWikilinkInner('Quantum Physics#Schrodinger|Wave Equation')).toEqual({
      target: 'Quantum Physics',
      alias: 'Wave Equation',
      heading: 'Schrodinger',
      displayText: 'Wave Equation',
    });
  });

  it('extracts all wikilinks from body content', () => {
    const text = 'See [[Note A]], check [[Note B|Alias B]], and refer to [[Note C#Sec]].';
    const links = extractWikilinks(text);
    expect(links.length).toBe(3);
    expect(links[0].target).toBe('Note A');
    expect(links[1].alias).toBe('Alias B');
    expect(links[2].heading).toBe('Sec');
  });

  it('renders wikilinks to HTML with data attributes', () => {
    const text = 'Link to [[Linear Algebra Foundations|Linear Algebra]]';
    const html = renderWikilinksToHtml(text, ['Linear Algebra Foundations']);
    expect(html).toContain('<a class="wikilink"');
    expect(html).toContain('data-target="Linear Algebra Foundations"');
    expect(html).toContain('data-alias="Linear Algebra"');
    expect(html).toContain('>Linear Algebra</a>');
  });

  it('marks unresolved wikilinks with wikilink-unresolved class and data-unresolved', () => {
    const text = 'Read [[NonExistentNote]]';
    const html = renderWikilinksToHtml(text, ['ExistingNote']);
    expect(html).toContain('wikilink-unresolved');
    expect(html).toContain('data-unresolved="true"');
  });
});

describe('GFM Markdown Rendering & XSS Sanitization', () => {
  it('renders headings h1 through h6', () => {
    const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    const html = renderMarkdown(md);
    expect(html).toContain('<h1>H1</h1>');
    expect(html).toContain('<h2>H2</h2>');
    expect(html).toContain('<h3>H3</h3>');
    expect(html).toContain('<h4>H4</h4>');
    expect(html).toContain('<h5>H5</h5>');
    expect(html).toContain('<h6>H6</h6>');
  });

  it('renders task lists with checkbox states', () => {
    const md = '- [ ] Todo item\n- [x] Done item';
    const html = renderMarkdown(md);
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled /> Todo item</li>');
    expect(html).toContain('<li class="task-list-item"><input type="checkbox" checked disabled /> Done item</li>');
  });

  it('renders tables and protects wikilink pipes in cells', () => {
    const md = '| Topic | Link |\n| --- | --- |\n| Physics | [[Quantum Physics Notes|Quantum]] |';
    const html = renderMarkdown(md, ['Quantum Physics Notes']);
    expect(html).toContain('<table><thead><tr><th>Topic</th><th>Link</th></tr></thead>');
    expect(html).toContain('<td>Physics</td>');
    expect(html).toContain('<a class="wikilink"');
    expect(html).toContain('Quantum</a>');
  });

  it('renders fenced code blocks with language syntax class and tokens', () => {
    const md = '```typescript\nconst x: number = 42;\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('<pre><code class="language-typescript">');
    expect(html).toContain('class="token-keyword">const</span>');
    expect(html).toContain('class="token-type">number</span>');
    expect(html).toContain('class="token-number">42</span>');
  });

  it('strips malicious script tags and inline event handlers (XSS protection)', () => {
    const dangerous = 'Normal text <script>alert("hack")</script><img src="x" onerror="alert(1)" />';
    const html = renderMarkdown(dangerous);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert("hack")');
    expect(html).not.toContain('onerror=');
  });
});
