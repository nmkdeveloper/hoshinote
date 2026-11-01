/**
 * Adversarial Probe & Empirical Stress Test Suite for Milestone 5 Remediation
 * Executed by challenger_m5_gen3_3
 */

import { parseMarkdownWithMath } from '../src/lib/markdown';

interface ProbeResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
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

console.log('═════════════════════════════════════════════════════════════════════');
console.log('      ADVERSARIAL STRESS TEST HARNESS — CHALLENGER M5.3              ');
console.log('═════════════════════════════════════════════════════════════════════\n');

// 1. MathJax expressions starting with digits / numbers
const r1 = parseMarkdownWithMath('For a $2 \\times 2$ invertible matrix:');
check(
  'MathJax Leading Numbers',
  'Formula $2 \\times 2$ rendered as vector SVG and not raw text',
  r1.includes('<svg class="math-inline"') && r1.includes('2 \\times 2') && !r1.includes('$2 \\times 2$'),
  `Output: ${r1.slice(0, 150)}...`
);

const r2 = parseMarkdownWithMath('The tolerance threshold is $10^{-5}$ for convergence.');
check(
  'MathJax Leading Numbers',
  'Formula $10^{-5}$ rendered as vector SVG',
  r2.includes('<svg class="math-inline"') && r2.includes('10^{-5}') && !r2.includes('$10^{-5}$'),
  `Output: ${r2.slice(0, 150)}...`
);

const r3 = parseMarkdownWithMath('Angle $\\theta \\approx 3.14 \\text{ rad}$ corresponds to $\\pi$.');
check(
  'MathJax Leading Numbers',
  'Formula $3.14 \\text{ rad}$ rendered as vector SVG',
  r3.includes('<svg class="math-inline"') && r3.includes('3.14 \\text{ rad}'),
  `Output: ${r3.slice(0, 150)}...`
);

const r4 = parseMarkdownWithMath('The spin is $1/2$ for fermions.');
check(
  'MathJax Leading Numbers',
  'Formula $1/2$ rendered as vector SVG',
  r4.includes('<svg class="math-inline"') && r4.includes('1/2') && !r4.includes('$1/2$'),
  `Output: ${r4.slice(0, 150)}...`
);

const r5 = parseMarkdownWithMath('Let $n = 2$ and $2$ be prime.');
check(
  'MathJax Leading Numbers',
  'Single-number math $2$ rendered as vector SVG',
  r5.includes('<svg class="math-inline"'),
  `Output: ${r5.slice(0, 150)}...`
);

const r6 = parseMarkdownWithMath('Identity: $10-5=5$.');
check(
  'MathJax Leading Numbers',
  'Arithmetic math $10-5=5$ rendered as vector SVG',
  r6.includes('<svg class="math-inline"') && r6.includes('10-5=5'),
  `Output: ${r6.slice(0, 150)}...`
);

const r7 = parseMarkdownWithMath('Value is $100\\times 2$.');
check(
  'MathJax Leading Numbers',
  'Math without space $100\\times 2$ rendered as vector SVG',
  r7.includes('<svg class="math-inline"') && r7.includes('100\\times 2'),
  `Output: ${r7.slice(0, 150)}...`
);

const r8 = parseMarkdownWithMath('Measurement: $0.50 \\pm 0.05$.');
check(
  'MathJax Leading Numbers',
  'Decimal math $0.50 \\pm 0.05$ rendered as vector SVG',
  r8.includes('<svg class="math-inline"') && r8.includes('0.50 \\pm 0.05'),
  `Output: ${r8.slice(0, 150)}...`
);

// 2. Currency strings preserved as literal text
const c1 = parseMarkdownWithMath('Prices are $50, $100.00, and $1,000,000.');
check(
  'Currency Protection',
  'Standalone currencies ($50, $100.00, $1,000,000) preserved as plain text',
  !c1.includes('<svg class="math-inline"') && c1.includes('$50') && c1.includes('$100.00') && c1.includes('$1,000,000'),
  `Output: ${c1}`
);

const c2 = parseMarkdownWithMath('Discount range: $100-$50.');
check(
  'Currency Protection',
  'Currency range $100-$50 preserved as text without breaking into math',
  !c2.includes('<svg class="math-inline"') && c2.includes('$100-$50'),
  `Output: ${c2}`
);

const c3 = parseMarkdownWithMath('Ratio is $50/$100.');
check(
  'Currency Protection',
  'Currency ratio $50/$100 preserved as text',
  !c3.includes('<svg class="math-inline"') && c3.includes('$50/$100'),
  `Output: ${c3}`
);

const c4 = parseMarkdownWithMath('Options: $5,$10.');
check(
  'Currency Protection',
  'Comma-delimited currency list $5,$10 preserved as text',
  !c4.includes('<svg class="math-inline"') && c4.includes('$5,$10'),
  `Output: ${c4}`
);

const c5 = parseMarkdownWithMath('Between $10-$20 and $30-$40, choose the best.');
check(
  'Currency Protection',
  'Multiple distinct currency ranges on the same line preserved',
  !c5.includes('<svg class="math-inline"') && c5.includes('$10-$20') && c5.includes('$30-$40'),
  `Output: ${c5}`
);

const c6 = parseMarkdownWithMath('Escaped: \\$50 only.');
check(
  'Currency Protection',
  'Escaped dollar \\$50 renders as literal $50 without backslash',
  !c6.includes('\\$50') && c6.includes('$50'),
  `Output: ${c6}`
);

// 3. Complex mixed sentences
const m1 = parseMarkdownWithMath('For a $2 \\times 2$ matrix book priced at $50-$60, total is $50.');
check(
  'Mixed Sentences',
  '$2 \\times 2$ math rendered alongside $50-$60 range and $50 single price',
  m1.includes('<svg class="math-inline"') && m1.includes('2 \\times 2') && m1.includes('$50-$60') && m1.includes('$50'),
  `Output: ${m1.slice(0, 150)}...`
);

const m2 = parseMarkdownWithMath('An apple costs $2, but $2^3 = 8$.');
check(
  'Mixed Sentences',
  'Apple price $2 vs math $2^3 = 8$ delineated accurately',
  m2.includes('$2') && m2.includes('<svg class="math-inline"') && m2.includes('2^3 = 8'),
  `Output: ${m2.slice(0, 150)}...`
);

const m3 = parseMarkdownWithMath('Between $10 and $20, we calculate $10 \\times 2 = 20$.');
check(
  'Mixed Sentences',
  'Currencies $10, $20 with math $10 \\times 2 = 20$ delineated accurately',
  m3.includes('$10') && m3.includes('$20') && m3.includes('<svg class="math-inline"') && m3.includes('10 \\times 2 = 20'),
  `Output: ${m3.slice(0, 150)}...`
);

const m4 = parseMarkdownWithMath('Use `$50` or `$100-$50` inside code.');
check(
  'Mixed Sentences',
  'Code blocks containing currency ($50) protected from conversion',
  m4.includes('<code>$50</code>') && m4.includes('<code>$100-$50</code>') && !m4.includes('<svg'),
  `Output: ${m4}`
);

const m5 = parseMarkdownWithMath('$$\n100 + 200 = 300\n$$');
check(
  'Mixed Sentences',
  'Display block math starting with numbers ($$100 + 200 = 300$$) renders properly',
  m5.includes('<div class="math-display"><svg class="math-block"') && m5.includes('100 + 200 = 300'),
  `Output: ${m5.slice(0, 150)}...`
);

let passed = 0;
let failed = 0;
for (const r of results) {
  if (r.status === 'PASS') {
    passed++;
    console.log(`[✔ PASS] [${r.category}] ${r.name}`);
  } else {
    failed++;
    console.log(`[✖ FAIL] [${r.category}] ${r.name}`);
    console.log(`       Evidence: ${r.details}`);
  }
}

console.log('\n─────────────────────────────────────────────────────────────────────');
console.log(`Total Probes: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
console.log('─────────────────────────────────────────────────────────────────────');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL PROBES PASSED SUCCESSFULLY.');
  process.exit(0);
}
