/**
 * Deep Adversarial Probe & Empirical Stress Test Suite for Milestone 3 Gate 2
 * Challenger: challenger_m3_r2_2
 */

import { validateLatex, renderMathToSvg, escapeHtml } from '../src/lib/math';
import { parseWikilinkInner, extractWikilinks, renderWikilinksToHtml } from '../src/lib/remark-wikilink';
import { renderMarkdown, parseMarkdownWithMath, sanitizeHtml } from '../src/lib/markdown';

interface Probe {
  id: string;
  category: string;
  title: string;
  execute: () => { pass: boolean; details: string };
}

const probes: Probe[] = [];

function registerProbe(id: string, category: string, title: string, testFn: () => { pass: boolean; details: string }) {
  probes.push({ id, category, title, execute: testFn });
}

// =====================================================================
// Category 1: XSS Sanitization & Injection Defense
// =====================================================================

registerProbe('XSS-01', 'XSS Sanitization', 'Unquoted onerror handler stripped on img', () => {
  const input = '<img src=x onerror=alert("XSS")>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('onerror') && !output.includes('alert');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-02', 'XSS Sanitization', 'Unquoted SVG onload handler stripped', () => {
  const input = '<svg/onload=alert(1)>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('onload') && !output.includes('alert');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-03', 'XSS Sanitization', 'Whitespace around equals in event handler stripped', () => {
  const input = '<img src="valid.png" onerror = "alert(1)">';
  const output = sanitizeHtml(input);
  const pass = !output.includes('onerror') && !output.includes('alert');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-04', 'XSS Sanitization', 'Newline in event handler stripped', () => {
  const input = '<img src="valid.png"\nonerror="alert(1)">';
  const output = sanitizeHtml(input);
  const pass = !output.includes('onerror') && !output.includes('alert');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-05', 'XSS Sanitization', 'Uppercase and mixed-case ONERROR / OnClick stripped', () => {
  const input = '<button ONCLICK="alert(1)" OnMouseOver="alert(2)">Click</button>';
  const output = sanitizeHtml(input);
  const pass = !output.toLowerCase().includes('onclick') && !output.toLowerCase().includes('onmouseover') && !output.includes('alert');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-06', 'XSS Sanitization', 'javascript: URI in href stripped/neutralized', () => {
  const input = '<a href="javascript:alert(document.cookie)">Click me</a>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('javascript:') && !output.includes('document.cookie');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-07', 'XSS Sanitization', 'javascript: URI with leading control chars / whitespace neutralized', () => {
  const input = '<a href="  javascript:alert(1)">Click</a>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('javascript:') && !output.includes('alert(1)');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-08', 'XSS Sanitization', 'vbscript: URI in href/src neutralized', () => {
  const input = '<a href="vbscript:msgbox(1)">Click</a>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('vbscript:') && !output.includes('msgbox');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-09', 'XSS Sanitization', 'Self-closing script tag stripped', () => {
  const input = '<script src="https://attacker.com/evil.js"/>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('<script') && !output.includes('evil.js');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-10', 'XSS Sanitization', 'Unclosed script tag stripped to end of string', () => {
  const input = 'Normal text <script src="evil.js">alert(1)';
  const output = sanitizeHtml(input);
  const pass = !output.includes('<script') && !output.includes('evil.js');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-11', 'XSS Sanitization', 'Iframe, object, embed tags completely removed', () => {
  const input = '<iframe src="https://evil.com"></iframe><object data="test"></object><embed src="test"/>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('<iframe') && !output.includes('<object') && !output.includes('<embed');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-12', 'XSS Sanitization', 'Boolean event handler without equal sign stripped', () => {
  const input = '<input type="text" onfocus autofocus>';
  const output = sanitizeHtml(input);
  const pass = !output.includes('onfocus');
  return { pass, details: `Input: ${input} -> Output: ${output}` };
});

registerProbe('XSS-13', 'XSS Sanitization', 'Legitimate MathJax SVG tags and attributes preserved', () => {
  const mathSvg = renderMathToSvg('E = mc^2', false);
  const pass = mathSvg.includes('<svg') && mathSvg.includes('class="math-inline"') && mathSvg.includes('viewBox=') && mathSvg.includes('<defs><path');
  return { pass, details: `SVG length: ${mathSvg.length}, hasDefs: ${mathSvg.includes('<defs>')}` };
});

// =====================================================================
// Category 2: Markdown Context Shielding & AST Isolation
// =====================================================================

registerProbe('AST-01', 'Context Shielding', 'Wikilink in fenced code block is not parsed to anchor tag', () => {
  const md = '```typescript\nimport { x } from "[[MyNote]]";\n```';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<a class="wikilink"') && html.includes('[[MyNote]]');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-02', 'Context Shielding', 'Wikilink in inline code span is not parsed to anchor tag', () => {
  const md = 'Syntax is `[[Target Note|Alias]]` here.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<a class="wikilink"') && html.includes('<code>[[Target Note|Alias]]</code>');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-03', 'Context Shielding', 'Wikilink in display math is not converted to anchor tag inside SVG', () => {
  const md = '$$\\text{Reference to [[Knowledge Base]]}$$';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<a class="wikilink"') && html.includes('class="math-block"');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-04', 'Context Shielding', 'Shell variables with $ in fenced code blocks are not converted to math', () => {
  const md = '```bash\necho $HOME/$USER\nexport VAR=$FOO\n```';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('math-inline') && !html.includes('<svg') && html.includes('$HOME/$USER');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-05', 'Context Shielding', 'Shell variables with $ in inline code are not converted to math', () => {
  const md = 'Run `echo $PATH$` to check system paths.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('math-inline') && !html.includes('<svg') && html.includes('<code>echo $PATH$</code>');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-06', 'Context Shielding', 'Markdown headers, lists, and bold inside code blocks are preserved verbatim', () => {
  const md = '```markdown\n# Header\n- [ ] Task Item\n**Bold Text**\n```';
  const html = renderMarkdown(md);
  const pass = !html.includes('<h1>') && !html.includes('<li class="task-list-item">') && !html.includes('<strong>') && html.includes('# Header');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-07', 'Context Shielding', 'Multiline display math inside blockquote renders valid DOM structure', () => {
  const md = '> $$\n> \\int_{0}^{1} f(x) dx = 1\n> $$';
  const html = parseMarkdownWithMath(md);
  const pass = html.includes('<blockquote><p><div class="math-display"><svg class="math-block"') && !html.includes('&gt;') && html.includes('</p></blockquote>');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-08', 'Context Shielding', 'Table cells with wikilinks containing pipe | split correctly', () => {
  const md = '| Column 1 | Column 2 |\n| --- | --- |\n| Data | [[Note Target|Custom Alias]] |';
  const html = parseMarkdownWithMath(md, ['Note Target']);
  const pass = html.includes('<td>Data</td>') && html.includes('<a class="wikilink"') && html.includes('Custom Alias</a>');
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-09', 'Context Shielding', 'Table cells with escaped pipe \\| split correctly without extra column', () => {
  const md = '| Syntax | Example |\n| --- | --- |\n| Pipe | Use \\| here |';
  const html = parseMarkdownWithMath(md);
  const pass = html.includes('<td>Pipe</td>') && html.includes('<td>Use | here</td>') && (html.match(/<td>/g) || []).length === 2;
  return { pass, details: `Output: ${html}` };
});

registerProbe('AST-10', 'Context Shielding', 'Table cells with inline code containing pipes split correctly', () => {
  const md = '| Cmd | Pipe |\n| --- | --- |\n| Test | `cat file | grep foo` |';
  const html = parseMarkdownWithMath(md);
  const pass = html.includes('<code>cat file | grep foo</code>') && (html.match(/<td>/g) || []).length === 2;
  return { pass, details: `Output: ${html}` };
});

// =====================================================================
// Category 3: Currency vs Math Discrimination
// =====================================================================

registerProbe('CURR-01', 'Currency Discrimination', 'Single currency amount $100 preserved as text without math SVG', () => {
  const md = 'The book costs $100.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<svg') && html.includes('$100');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-02', 'Currency Discrimination', 'Decimal and comma amounts $1,250.99 preserved as text', () => {
  const md = 'Balance is $1,250.99 and tax is $45.50.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<svg') && html.includes('$1,250.99') && html.includes('$45.50');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-03', 'Currency Discrimination', 'Price range $100-$50 preserved without corrupting into math', () => {
  const md = 'Price drop from $100-$50 during sale.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('math-inline') && !html.includes('<svg') && html.includes('$100-$50');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-04', 'Currency Discrimination', 'Price comparison $50/$100 preserved without corrupting into math', () => {
  const md = 'Tickets cost $50/$100.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('math-inline') && !html.includes('<svg') && html.includes('$50/$100');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-05', 'Currency Discrimination', 'Comma separated currency list preserved', () => {
  const md = 'Fees are $5, $10, and $20 respectively.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<svg') && html.includes('$5, $10, and $20');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-06', 'Currency Discrimination', 'Escaped dollar sign \\$50 renders as literal $50', () => {
  const md = 'Pay \\$50 to unlock.';
  const html = parseMarkdownWithMath(md);
  const pass = !html.includes('<svg') && html.includes('$50') && !html.includes('\\$');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-07', 'Currency Discrimination', 'Mixed currency, escaped dollars, and math in same text block', () => {
  const md = 'Invest $500 in formula $E = mc^2$ while saving \\$50!';
  const html = parseMarkdownWithMath(md);
  const pass = html.includes('$500') && html.includes('$50') && html.includes('class="math-inline"') && html.includes('data-latex="E = mc^2"');
  return { pass, details: `Output: ${html}` };
});

registerProbe('CURR-08', 'Currency Discrimination', 'Math formula with leading numbers e.g. $2x + 3y = 5$ recognized as math', () => {
  const md = 'Calculate $2x + 3y = 5$ for x and y.';
  const html = parseMarkdownWithMath(md);
  const pass = html.includes('class="math-inline"') && html.includes('data-latex="2x + 3y = 5"');
  return { pass, details: `Output: ${html}` };
});

// =====================================================================
// Category 4: LaTeX Escaped Braces & Environment Validation
// =====================================================================

registerProbe('LATEX-01', 'LaTeX Validation', 'Piecewise with \\left\\{ x \\right. is valid', () => {
  const res = validateLatex('\\left\\{ x \\right.');
  return { pass: res.valid, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-02', 'LaTeX Validation', 'Set notation with literal braces \\{ 1, 2, 3 \\} is valid', () => {
  const res = validateLatex('\\{ 1, 2, 3 \\}');
  return { pass: res.valid, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-03', 'LaTeX Validation', 'Double backslash line-break before grouping brace \\\\{ a \\} handled correctly', () => {
  // In LaTeX, \\ is newline, so \\{ is newline + opening brace {.
  // Thus \\{ a \\} is 2 backslashes before { -> not escaped, counts as grouping brace.
  const res = validateLatex('a \\\\{ b }');
  return { pass: res.valid, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-04', 'LaTeX Validation', 'Triple backslash \\\\\\{ (newline + escaped brace) recognized as escaped brace', () => {
  // 3 slashes before { means odd count -> escaped brace.
  const res = validateLatex('a \\\\\\{ b \\\\\\}');
  return { pass: res.valid, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-05', 'LaTeX Validation', 'Unbalanced opening brace { x + y fails with SyntaxError', () => {
  const res = validateLatex('{ x + y');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-06', 'LaTeX Validation', 'Unbalanced closing brace x + y } fails with SyntaxError', () => {
  const res = validateLatex('x + y }');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-07', 'LaTeX Validation', 'Mismatched environment \\begin{matrix}...\\end{align} fails with SyntaxError', () => {
  const res = validateLatex('\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{align}');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-08', 'LaTeX Validation', 'Unclosed environment \\begin{equation} E=mc^2 fails with SyntaxError', () => {
  const res = validateLatex('\\begin{equation} E = mc^2');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-09', 'LaTeX Validation', 'Orphaned \\end{equation} fails with SyntaxError', () => {
  const res = validateLatex('E = mc^2 \\end{equation}');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-10', 'LaTeX Validation', 'Correctly nested LIFO environments pass validation', () => {
  const res = validateLatex('\\begin{equation} \\begin{split} a &= b \\\\ c &= d \\end{split} \\end{equation}');
  return { pass: res.valid, details: `valid=${res.valid}, error=${res.error}` };
});

registerProbe('LATEX-11', 'LaTeX Validation', 'Cross-nested environments \\begin{A}\\begin{B}\\end{A}\\end{B} rejected', () => {
  const res = validateLatex('\\begin{matrix} \\begin{pmatrix} 1 \\end{matrix} \\end{pmatrix}');
  const pass = !res.valid && res.error?.includes('SyntaxError');
  return { pass, details: `valid=${res.valid}, error=${res.error}` };
});

// =====================================================================
// Category 5: Vector SVG Typography Output & Rendering
// =====================================================================

registerProbe('SVG-01', 'Vector Typography', 'Inline math produces scalable vector SVG with <defs><path> glyphs', () => {
  const svg = renderMathToSvg('E = mc^2', false);
  const hasDefs = svg.includes('<defs>') && svg.includes('<path');
  const hasClass = svg.includes('class="math-inline"');
  const hasViewBox = svg.includes('viewBox=');
  const hasNoTextMock = !svg.includes('<text y=') && !svg.includes('<text x=');
  const pass = hasDefs && hasClass && hasViewBox && hasNoTextMock;
  return { pass, details: `hasDefs=${hasDefs}, hasClass=${hasClass}, hasViewBox=${hasViewBox}, hasNoTextMock=${hasNoTextMock}` };
});

registerProbe('SVG-02', 'Vector Typography', 'Display math wrapped in div.math-display with svg.math-block', () => {
  const svg = renderMathToSvg('\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', true);
  const pass = svg.startsWith('<div class="math-display">') && svg.includes('<svg class="math-block"') && svg.endsWith('</div>');
  return { pass, details: `Prefix: ${svg.slice(0, 50)}, Suffix: ${svg.slice(-30)}` };
});

registerProbe('SVG-03', 'Vector Typography', 'Fraction creates vector layout glyphs without mock text', () => {
  const svg = renderMathToSvg('\\frac{a + b}{c + d}', false);
  const pass = svg.includes('data-mml-node="mfrac"') && svg.includes('<rect') && !svg.includes('<text');
  return { pass, details: `mml-node=mfrac: ${svg.includes('data-mml-node="mfrac"')}, hasRect: ${svg.includes('<rect')}` };
});

registerProbe('SVG-04', 'Vector Typography', 'Radical / square root creates vector surd geometry', () => {
  const svg = renderMathToSvg('\\sqrt{x^2 + 1}', false);
  const pass = svg.includes('data-mml-node="msqrt"') && svg.includes('<path') && svg.includes('<rect');
  return { pass, details: `mml-node=msqrt: ${svg.includes('data-mml-node="msqrt"')}` };
});

registerProbe('SVG-05', 'Vector Typography', 'Matrix rendering generates structured tabular vector geometry', () => {
  const svg = renderMathToSvg('\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}', true);
  const pass = svg.includes('data-mml-node="mtable"') && svg.includes('data-mml-node="mtr"');
  return { pass, details: `mtable: ${svg.includes('data-mml-node="mtable"')}, mtr: ${svg.includes('data-mml-node="mtr"')}` };
});

registerProbe('SVG-06', 'Vector Typography', 'Accessible <title> and data-latex attributes preserved with escaped LaTeX', () => {
  const latex = 'f(x) < g(x) & h(x) > 0';
  const svg = renderMathToSvg(latex, false);
  const safe = escapeHtml(latex);
  const pass = svg.includes(`<title>${safe}</title>`) && svg.includes(`data-latex="${safe}"`);
  return { pass, details: `hasTitle: ${svg.includes(`<title>${safe}</title>`)}, hasDataLatex: ${svg.includes(`data-latex="${safe}"`)}` };
});

registerProbe('SVG-07', 'Vector Typography', 'Syntax error renders span.math-error with data-error message', () => {
  const svg = renderMathToSvg('\\begin{matrix} 1 & 2 \\end{pmatrix}', false);
  const pass = svg.includes('class="math-error"') && svg.includes('data-error="SyntaxError: Unbalanced braces or unclosed environment"');
  return { pass, details: `Output: ${svg}` };
});

// =====================================================================
// Runner & Summary Execution
// =====================================================================

console.log('═════════════════════════════════════════════════════════════════════');
console.log('   DEEP ADVERSARIAL EMPIRICAL HARNESS — CHALLENGER M3_R2_2           ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

for (const probe of probes) {
  try {
    const res = probe.execute();
    if (res.pass) {
      console.log(`[✔ PASS] [${probe.id}] [${probe.category}] ${probe.title}`);
      passCount++;
    } else {
      console.log(`[✖ FAIL] [${probe.id}] [${probe.category}] ${probe.title}`);
      console.log(`       Details: ${res.details}`);
      failCount++;
    }
  } catch (err: any) {
    console.log(`[✖ CRASH] [${probe.id}] [${probe.category}] ${probe.title}`);
    console.log(`       Error: ${err?.message || err}`);
    failCount++;
  }
}

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log(`PROBE SUMMARY: Total: ${probes.length} | Passed: ${passCount} | Failed: ${failCount}`);
console.log(`PASS RATE: ${((passCount / probes.length) * 100).toFixed(1)}%`);
console.log('═════════════════════════════════════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
}
