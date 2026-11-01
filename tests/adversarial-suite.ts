/**
 * Adversarial Probe & Empirical Stress Test Suite for Milestone 3
 * Executed by challenger_m3_2
 */

import { validateLatex, renderMathToSvg } from '../src/lib/math';
import { parseWikilinkInner, renderWikilinksToHtml } from '../src/lib/remark-wikilink';
import { renderMarkdown, parseMarkdownWithMath } from '../src/lib/markdown';

interface ProbeResult {
  category: string;
  name: string;
  status: 'FAIL' | 'PASS';
  details: string;
}

const results: ProbeResult[] = [];

function check(category: string, name: string, condition: boolean, details: string) {
  results.push({
    category,
    name,
    status: condition ? 'PASS' : 'FAIL',
    details,
  });
}

// 1. XSS Security Probing
const xss1 = renderMarkdown('<img src=x onerror=alert(1)>');
check('Security', 'Unquoted onerror attribute sanitized', !xss1.includes('onerror=') && !xss1.includes('alert(1)'), `Output: ${xss1}`);

const xss2 = renderMarkdown('<svg onload=alert(1)>');
check('Security', 'Unquoted SVG onload attribute sanitized', !xss2.includes('onload=') && !xss2.includes('alert(1)'), `Output: ${xss2}`);

const xss3 = renderMarkdown('<a href="javascript:alert(1)">click</a>');
check('Security', 'javascript: URI scheme sanitized', !xss3.includes('javascript:'), `Output: ${xss3}`);

const xss4 = renderMarkdown('<script src="https://evil.com/xss.js"/>');
check('Security', 'Self-closing script tag stripped', !xss4.includes('<script'), `Output: ${xss4}`);

const xss5 = renderMarkdown('<details open ontoggle=alert(1)>test</details>');
check('Security', 'Unquoted ontoggle attribute sanitized', !xss5.includes('ontoggle='), `Output: ${xss5}`);

// 2. Wikilinks Isolation
const wlInCode = parseMarkdownWithMath('```typescript\n// Refer to [[MyNote]]\n```');
check('Wikilink Isolation', 'Wikilink in fenced code block not converted to link', !wlInCode.includes('<a class="wikilink"'), `Output: ${wlInCode}`);

const wlInInlineCode = parseMarkdownWithMath('Use `[[MyNote]]` syntax');
check('Wikilink Isolation', 'Wikilink in inline code not converted to link', !wlInInlineCode.includes('<a class="wikilink"'), `Output: ${wlInInlineCode}`);

const wlInMath = parseMarkdownWithMath('$$\\text{See [[Target Note]]}$$');
check('Wikilink Isolation', 'Wikilink in display math not converted to <a> inside SVG', !wlInMath.includes('<a class="wikilink"'), `Output: ${wlInMath}`);

// 3. Math Isolation in Code Blocks
const mathInFenced = parseMarkdownWithMath('```bash\necho $VAR$\n```');
check('Math Isolation', 'Math syntax in fenced code block not converted to SVG', !mathInFenced.includes('math-inline'), `Output: ${mathInFenced}`);

const mathInInline = parseMarkdownWithMath('Run `echo $VAR$` now');
check('Math Isolation', 'Math syntax in inline code not converted to SVG', !mathInInline.includes('math-inline'), `Output: ${mathInInline}`);

// 4. Currency vs Math Discrimination
const priceRange = parseMarkdownWithMath('Price is $100-$50');
check('Currency Discrimination', 'Price range $100-$50 preserved without math SVG', !priceRange.includes('math-inline'), `Output: ${priceRange}`);

const promptCurrency = parseMarkdownWithMath('$100 is spent on $x^2 + y^2 = z^2$ and \\$50 is saved');
check('Currency Discrimination', 'Prompt currency & math mixed handled correctly', promptCurrency.includes('$100') && promptCurrency.includes('$50') && promptCurrency.includes('x^2 + y^2 = z^2'), `Output: ${promptCurrency}`);

// 5. Blockquote / List Multiline Display Math
const multilineBq = parseMarkdownWithMath('> $$\n> E = mc^2\n> $$');
const bqTagsBalanced = !multilineBq.includes('</p></blockquote>\n&gt;</text>');
check('AST Consistency', 'Multiline display math in blockquote produces valid balanced HTML', bqTagsBalanced, `Output: ${multilineBq}`);

// 6. LaTeX Syntax Validation
const leftBrace = validateLatex('\\left\\{ x \\right.');
check('LaTeX Validation', 'LaTeX \\left\\{ x \\right. is valid', leftBrace.valid, `Error: ${leftBrace.error}`);

const mismatchedEnv = validateLatex('\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{align}');
check('LaTeX Validation', 'Mismatched environment \\begin{matrix}...\\end{align} is rejected', !mismatchedEnv.valid, `Result: valid=${mismatchedEnv.valid}`);

// 7. Markdown in Code Blocks
const mdInCode = renderMarkdown('```markdown\n- [ ] Task\n*italic*\n```');
const codeHasNoLi = !mdInCode.includes('<li class="task-list-item">') && !mdInCode.includes('<em>');
check('Code Block Isolation', 'Markdown syntax inside code block is not transformed into HTML elements', codeHasNoLi, `Output: ${mdInCode}`);

// Report Summary
console.log('═════════════════════════════════════════════════════════════════════');
console.log('      ADVERSARIAL STRESS TEST RESULTS — CHALLENGER M3.2              ');
console.log('═════════════════════════════════════════════════════════════════════');
let passCount = 0;
let failCount = 0;

for (const r of results) {
  const icon = r.status === 'PASS' ? '✔ PASS' : '✖ FAIL';
  console.log(`[${icon}] [${r.category}] ${r.name}`);
  if (r.status === 'FAIL') {
    console.log(`       Evidence: ${r.details.replace(/\n/g, ' ')}`);
    failCount++;
  } else {
    passCount++;
  }
}

console.log('─────────────────────────────────────────────────────────────────────');
console.log(`Total Probes: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('═════════════════════════════════════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
}
