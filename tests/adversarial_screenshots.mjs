/**
 * Adversarial Stress & Verification Test Suite for Screenshot Capture Pipeline
 *
 * Checks:
 * 1. Binary validation: existence, size > 50KB, valid 8-byte PNG signature
 * 2. Dimension check: IHDR chunk width >= 1280 and height >= 720
 * 3. Distinctness check: SHA-256 hashes, IDAT decompression, intra-image variance, inter-image variance
 * 4. Script resilience: Rapid execution, port 4180 rebind verification, back-to-back rerun stability
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import net from 'node:net';
import { spawnSync } from 'node:child_process';

console.log('═════════════════════════════════════════════════════════════════════');
console.log('    ADVERSARIAL STRESS TEST SUITE: VISUAL UI SCREENSHOT PIPELINE    ');
console.log('═════════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testName, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`[PASS] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${testName}`);
    if (detail) console.error(`       Evidence: ${detail}`);
  }
}

const SCREENSHOTS_DIR = path.resolve('artifacts', 'screenshots');
const EXPECTED_FILES = [
  '01-main-editor.png',
  '02-mathjax-rendering.png',
  '03-interactive-graph.png',
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Parse PNG chunks from a file buffer
 */
function parsePng(buffer) {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG signature');
  }

  const chunks = [];
  let offset = 8;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;
    if (dataEnd + 4 > buffer.length) break;
    const data = buffer.subarray(dataOffset, dataEnd);
    const crc = buffer.readUInt32BE(dataEnd);

    chunks.push({ type, length, data, crc });
    offset = dataEnd + 4;
  }

  const ihdrChunk = chunks.find((c) => c.type === 'IHDR');
  if (!ihdrChunk || ihdrChunk.length !== 13) {
    throw new Error('Missing or corrupt IHDR chunk');
  }

  const width = ihdrChunk.data.readUInt32BE(0);
  const height = ihdrChunk.data.readUInt32BE(4);
  const bitDepth = ihdrChunk.data.readUInt8(8);
  const colorType = ihdrChunk.data.readUInt8(9);
  const compression = ihdrChunk.data.readUInt8(10);
  const filter = ihdrChunk.data.readUInt8(11);
  const interlace = ihdrChunk.data.readUInt8(12);

  // Decompress IDAT chunks to access raw scanlines
  const idatChunks = chunks.filter((c) => c.type === 'IDAT').map((c) => c.data);
  const compressedIdat = Buffer.concat(idatChunks);
  let rawPixels;
  try {
    rawPixels = zlib.inflateSync(compressedIdat);
  } catch (err) {
    rawPixels = null;
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    compression,
    filter,
    interlace,
    chunksCount: chunks.length,
    hasIend: chunks.some((c) => c.type === 'IEND'),
    rawPixels,
  };
}

/**
 * Compute pixel statistics (mean, variance, standard deviation)
 */
function computePixelStats(buffer) {
  if (!buffer || buffer.length === 0) return { mean: 0, stdDev: 0, nonZeroRatio: 0 };
  let sum = 0;
  let nonZeroCount = 0;
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    sum += val;
    if (val > 0) nonZeroCount++;
  }
  const mean = sum / buffer.length;
  let varianceSum = 0;
  for (let i = 0; i < buffer.length; i++) {
    varianceSum += Math.pow(buffer[i] - mean, 2);
  }
  const variance = varianceSum / buffer.length;
  const stdDev = Math.sqrt(variance);
  const nonZeroRatio = nonZeroCount / buffer.length;
  return { mean, stdDev, nonZeroRatio };
}

/**
 * Compute Mean Absolute Difference (MAD) between two raw pixel buffers
 */
function computePixelDifference(bufA, bufB) {
  const minLen = Math.min(bufA.length, bufB.length);
  let diffSum = 0;
  for (let i = 0; i < minLen; i++) {
    diffSum += Math.abs(bufA[i] - bufB[i]);
  }
  return diffSum / minLen;
}

/**
 * Check if a port can be immediately bound
 */
function checkPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', (err) => {
      resolve({ free: false, error: err.code });
    });
    srv.once('listening', () => {
      srv.close(() => {
        resolve({ free: true });
      });
    });
    srv.listen(port, '127.0.0.1');
  });
}

async function runAdversarialSuite() {
  console.log('--- SECTION 1: Binary Existence & Magic Signature Validation ---');

  const fileBuffers = new Map();
  const parsedMap = new Map();
  const hashes = new Map();

  for (const fileName of EXPECTED_FILES) {
    const filePath = path.join(SCREENSHOTS_DIR, fileName);

    // 1.1 Existence
    const exists = fs.existsSync(filePath);
    report(`Artifact exists: ${fileName}`, exists, `File missing at ${filePath}`);

    if (exists) {
      const buf = fs.readFileSync(filePath);
      fileBuffers.set(fileName, buf);

      // 1.2 File size > 50,000 bytes
      const sizeValid = buf.length > 50000;
      report(
        `Artifact size > 50KB: ${fileName} (${(buf.length / 1024).toFixed(1)} KB)`,
        sizeValid,
        `Size was ${buf.length} bytes <= 50000`
      );

      // 1.3 8-byte PNG signature
      const sigValid = buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE);
      report(`Artifact 8-byte PNG signature: ${fileName}`, sigValid, `Header: ${buf.subarray(0, 8).toString('hex')}`);

      // 1.4 Parse PNG structure
      let parsed = null;
      try {
        parsed = parsePng(buf);
        parsedMap.set(fileName, parsed);
      } catch (err) {
        // failed parse
      }

      report(`Artifact PNG structure & IEND chunk: ${fileName}`, parsed !== null && parsed.hasIend, 'Failed parsing chunks');

      // SHA-256
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      hashes.set(fileName, hash);
    }
  }

  console.log('\n--- SECTION 2: IHDR Dimensions & Color Spec Validation ---');

  for (const fileName of EXPECTED_FILES) {
    const parsed = parsedMap.get(fileName);
    if (!parsed) {
      report(`Dimensions >= 1280x720: ${fileName}`, false, 'Unparsed PNG');
      continue;
    }

    const widthValid = parsed.width >= 1280;
    const heightValid = parsed.height >= 720;
    report(
      `Viewport resolution meets 1280x720 requirement: ${fileName} (${parsed.width}x${parsed.height})`,
      widthValid && heightValid,
      `Width: ${parsed.width}, Height: ${parsed.height}`
    );

    const colorValid = parsed.bitDepth === 8 && (parsed.colorType === 2 || parsed.colorType === 6);
    report(
      `Color profile valid (bit depth ${parsed.bitDepth}, color type ${parsed.colorType}): ${fileName}`,
      colorValid,
      `BitDepth: ${parsed.bitDepth}, ColorType: ${parsed.colorType}`
    );
  }

  console.log('\n--- SECTION 3: Content Distinctness & Non-Triviality ---');

  // 3.1 Pairwise SHA-256 uniqueness
  const hash01 = hashes.get('01-main-editor.png');
  const hash02 = hashes.get('02-mathjax-rendering.png');
  const hash03 = hashes.get('03-interactive-graph.png');

  const shaDistinct01_02 = hash01 && hash02 && hash01 !== hash02;
  const shaDistinct01_03 = hash01 && hash03 && hash01 !== hash03;
  const shaDistinct02_03 = hash02 && hash03 && hash02 !== hash03;

  report('SHA-256 distinctness: View 1 vs View 2', shaDistinct01_02, `View 1: ${hash01}, View 2: ${hash02}`);
  report('SHA-256 distinctness: View 1 vs View 3', shaDistinct01_03, `View 1: ${hash01}, View 3: ${hash03}`);
  report('SHA-256 distinctness: View 2 vs View 3', shaDistinct02_03, `View 2: ${hash02}, View 3: ${hash03}`);

  // 3.2 Intra-image non-triviality (pixel variance > 10, not solid black or white)
  for (const fileName of EXPECTED_FILES) {
    const parsed = parsedMap.get(fileName);
    if (parsed && parsed.rawPixels) {
      const stats = computePixelStats(parsed.rawPixels);
      const isNotMonochrome = stats.stdDev > 10.0;
      report(
        `Intra-image pixel entropy/variance is non-trivial: ${fileName} (stdDev: ${stats.stdDev.toFixed(2)}, mean: ${stats.mean.toFixed(2)})`,
        isNotMonochrome,
        `stdDev too low: ${stats.stdDev}`
      );
    } else {
      report(`Intra-image pixel entropy/variance: ${fileName}`, false, 'Missing uncompressed pixels');
    }
  }

  // 3.3 Inter-image pixel divergence (Mean Absolute Difference > 5 out of 255)
  const raw01 = parsedMap.get('01-main-editor.png')?.rawPixels;
  const raw02 = parsedMap.get('02-mathjax-rendering.png')?.rawPixels;
  const raw03 = parsedMap.get('03-interactive-graph.png')?.rawPixels;

  if (raw01 && raw02 && raw03) {
    const mad01_02 = computePixelDifference(raw01, raw02);
    const mad01_03 = computePixelDifference(raw01, raw03);
    const mad02_03 = computePixelDifference(raw02, raw03);

    report(
      `Pairwise pixel divergence View 1 vs View 2 (Mean Abs Diff: ${mad01_02.toFixed(2)} / 255)`,
      mad01_02 > 5.0,
      `MAD too low: ${mad01_02}`
    );
    report(
      `Pairwise pixel divergence View 1 vs View 3 (Mean Abs Diff: ${mad01_03.toFixed(2)} / 255)`,
      mad01_03 > 5.0,
      `MAD too low: ${mad01_03}`
    );
    report(
      `Pairwise pixel divergence View 2 vs View 3 (Mean Abs Diff: ${mad02_03.toFixed(2)} / 255)`,
      mad02_03 > 5.0,
      `MAD too low: ${mad02_03}`
    );
  } else {
    report('Pairwise pixel divergence analysis', false, 'Missing uncompressed pixel buffers');
  }

  console.log('\n--- SECTION 4: Script Resilience, Port Cleanliness & Rapid Rerun ---');

  // 4.1 Check port 4180 cleanliness before rerun
  const portStatusBefore = await checkPortFree(4180);
  report('Vite preview server cleanly closed port 4180 (no zombie process)', portStatusBefore.free, `Port error: ${portStatusBefore.error}`);

  // 4.2 Execute script rerun to verify reproducible execution
  console.log('      Executing scripts/capture-screenshots.mjs rerun (Pass 1)...');
  const t0 = Date.now();
  const run1 = spawnSync(process.execPath, ['scripts/capture-screenshots.mjs'], {
    encoding: 'utf8',
    timeout: 30000,
  });
  const t1 = Date.now();
  const run1Success = run1.status === 0;
  report(
    `Execution rerun Pass 1 completed successfully in ${((t1 - t0) / 1000).toFixed(1)}s (exit code 0)`,
    run1Success,
    run1.stderr || run1.stdout
  );

  // 4.3 Check port 4180 immediately freed after rerun
  const portStatusAfterRun1 = await checkPortFree(4180);
  report('Port 4180 immediately freed after rerun Pass 1', portStatusAfterRun1.free, `Port error: ${portStatusAfterRun1.error}`);

  // 4.4 Rapid back-to-back execution (Pass 2) to test for race conditions/locks
  console.log('      Executing scripts/capture-screenshots.mjs rapid rerun (Pass 2)...');
  const t2 = Date.now();
  const run2 = spawnSync(process.execPath, ['scripts/capture-screenshots.mjs'], {
    encoding: 'utf8',
    timeout: 30000,
  });
  const t3 = Date.now();
  const run2Success = run2.status === 0;
  report(
    `Rapid back-to-back rerun Pass 2 completed successfully in ${((t3 - t2) / 1000).toFixed(1)}s (exit code 0)`,
    run2Success,
    run2.stderr || run2.stdout
  );

  const portStatusAfterRun2 = await checkPortFree(4180);
  report('Port 4180 immediately freed after rerun Pass 2', portStatusAfterRun2.free, `Port error: ${portStatusAfterRun2.error}`);

  // 4.5 Verify all 3 files are still intact and valid after reruns
  let postRerunValid = true;
  for (const fileName of EXPECTED_FILES) {
    const filePath = path.join(SCREENSHOTS_DIR, fileName);
    const stat = fs.statSync(filePath);
    if (stat.size <= 50000) postRerunValid = false;
  }
  report('Artifacts remain intact and >50KB after back-to-back reruns', postRerunValid);

  console.log('\n═════════════════════════════════════════════════════════════════════');
  console.log(` SUMMARY: Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('═════════════════════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('Fatal test harness error:', err);
  process.exit(1);
});
