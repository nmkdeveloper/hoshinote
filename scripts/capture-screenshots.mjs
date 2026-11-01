/**
 * Automated Visual UI Screenshot Verification for Hoshinote (Milestone 5)
 * Captures 3 canonical views:
 *   1. artifacts/screenshots/01-main-editor.png
 *   2. artifacts/screenshots/02-mathjax-rendering.png
 *   3. artifacts/screenshots/03-interactive-graph.png
 */

import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

const SCREENSHOTS_DIR = path.resolve('artifacts', 'screenshots');
const PREVIEW_PORT = 4180;

const RICH_MATH_MARKDOWN = `# Mathematical Physics & Matrix Calculus 🌌

Comprehensive vector SVG mathematical typography rendered with **MathJax**.

## 1. Matrix Inverses & Determinants
For a $2 \\times 2$ invertible matrix $A \\in \\mathbb{R}^{2 \\times 2}$:

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$$

And for higher-dimensional linear operators:

$$\\det(A - \\lambda I) = 0 \\implies A \\mathbf{v}_i = \\lambda_i \\mathbf{v}_i$$

## 2. Maxwell's Field Equations
Electrodynamics in differential and integral form:

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}$$

$$\\oint_{\\partial \\Omega} \\mathbf{E} \\cdot d\\mathbf{S} = \\frac{1}{\\varepsilon_0} \\iiint_{\\Omega} \\rho \\, dV$$

## 3. Calculus & Quadratic Formula
Roots of quadratic polynomials via:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

And the Gaussian normal distribution integral:

$$\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}$$

Related notes: [[Welcome to Hoshinote]], [[Quantum Physics Notes]], [[Linear Algebra Foundations]].
`;

async function main() {
  console.log('=== Hoshinote Visual UI Verification ===\n');

  // 1. Ensure output directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // 2. Ensure dist build exists
  if (!fs.existsSync(path.resolve('dist', 'index.html'))) {
    console.error('Error: Production build dist/index.html not found. Run "pnpm run build" first.');
    process.exit(1);
  }

  let server;
  let browser;

  try {
    // 3. Launch in-process Vite preview server
    console.log('[1/4] Starting Vite preview server...');
    server = await preview({
      preview: {
        port: PREVIEW_PORT,
        strictPort: false,
      },
    });
    const baseUrl = server.resolvedUrls?.local?.[0] || `http://127.0.0.1:${PREVIEW_PORT}/`;
    console.log(`      Server ready at ${baseUrl}`);

    // 4. Launch browser (Edge on Windows, fallback to Chromium)
    console.log('[2/4] Launching headless browser...');
    try {
      browser = await chromium.launch({
        channel: process.platform === 'win32' ? 'msedge' : undefined,
        headless: true,
      });
      console.log(`      Launched with channel: ${process.platform === 'win32' ? 'msedge' : 'default chromium'}`);
    } catch (err) {
      console.warn(`      Edge channel failed (${err.message}). Falling back to default chromium.`);
      browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    console.log('[3/4] Navigating and capturing views...');
    await page.goto(baseUrl);
    await page.waitForSelector('input[aria-label="Note title"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    // --- VIEW 1: Main Desktop Editor (Split View, Toolbar, Sidebar) ---
    const pathView1 = path.join(SCREENSHOTS_DIR, '01-main-editor.png');
    await page.screenshot({ path: pathView1 });
    console.log(`      ✓ View 1 captured: ${pathView1}`);

    // --- VIEW 2: Rendered MathJax (Complex formulas, fractions, matrices) ---
    // Create new note
    const newNoteBtn = page.locator('button:has-text("New Note")').first();
    await newNoteBtn.click();
    await page.waitForTimeout(400);

    // Set title
    const titleInput = page.locator('input[aria-label="Note title"]');
    await titleInput.fill('Mathematical Physics & Matrix Calculus');
    await titleInput.dispatchEvent('change');

    // Type rich math markdown
    const cmContent = page.locator('.cm-content');
    await cmContent.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(RICH_MATH_MARKDOWN);

    // Wait for debounced autosave (350ms) and MathJax vector SVG compilation
    await page.waitForTimeout(1000);

    // Switch to Preview Only mode
    const previewBtn = page.locator('button[title="Preview Only"]');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(500);
    }

    const pathView2 = path.join(SCREENSHOTS_DIR, '02-mathjax-rendering.png');
    await page.screenshot({ path: pathView2 });
    console.log(`      ✓ View 2 captured: ${pathView2}`);

    // --- VIEW 3: Interactive Graph Drawer ---
    const graphBtn = page.locator('button:has-text("Graph")');
    await graphBtn.click();

    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForSelector('[aria-label="Graph Controls"]', { timeout: 15000 });

    // Allow physics simulation warmup and cooldown
    await page.waitForTimeout(2000);

    // Reset view so graph nodes and labels are cleanly proportioned and legible without colliding
    const resetViewBtn = page.locator('button[aria-label="Reset zoom and center"], button[aria-label="Reset view"], button:has-text("Reset")').first();
    if (await resetViewBtn.isVisible()) {
      await resetViewBtn.click();
      await page.waitForTimeout(800);
    }

    const pathView3 = path.join(SCREENSHOTS_DIR, '03-interactive-graph.png');
    await page.screenshot({ path: pathView3 });
    console.log(`      ✓ View 3 captured: ${pathView3}`);

    // --- 5. Self-Validation of Output Files ---
    console.log('\n[4/4] Validating screenshot artifacts...');
    const files = [
      { name: '01-main-editor.png', path: pathView1 },
      { name: '02-mathjax-rendering.png', path: pathView2 },
      { name: '03-interactive-graph.png', path: pathView3 },
    ];

    let allValid = true;
    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        console.error(`      ✗ Missing: ${file.name}`);
        allValid = false;
        continue;
      }

      const stat = fs.statSync(file.path);
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(file.path, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;

      const sizeKB = (stat.size / 1024).toFixed(1);
      if (isPng && stat.size > 50000) {
        console.log(`      ✓ ${file.name}: ${sizeKB} KB (Valid PNG)`);
      } else {
        console.error(`      ✗ ${file.name}: Invalid file format or size too small (${stat.size} bytes)`);
        allValid = false;
      }
    }

    if (!allValid) {
      throw new Error('Screenshot validation failed.');
    }

    console.log('\n✓ Visual UI screenshot verification completed successfully.');
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

main().catch((err) => {
  console.error('\nScreenshot capture execution error:', err);
  process.exit(1);
});
