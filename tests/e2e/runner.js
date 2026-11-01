#!/usr/bin/env node

/**
 * Hoshinote Independent E2E Test Runner
 *
 * Runs the 4 tiers of opaque-box E2E test suites:
 * - Tier 1: Feature Coverage (31 tests)
 * - Tier 2: Boundary & Corner Cases (30 tests)
 * - Tier 3: Cross-Feature Combinations (12 tests)
 * - Tier 4: Real-World Workload Scenarios (5 tests)
 *
 * Exit Codes:
 * - 0: All tests passed
 * - 1: One or more tests failed
 */

import { tier1Tests } from './tiers/tier1_features.js';
import { tier2Tests } from './tiers/tier2_boundaries.js';
import { tier3Tests } from './tiers/tier3_combinations.js';
import { tier4Tests } from './tiers/tier4_scenarios.js';

// ANSI terminal colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Parse CLI flags
const args = process.argv.slice(2);
const tierArg = args.find(a => a.startsWith('--tier='));
const filterArg = args.find(a => a.startsWith('--filter='));
const verbose = args.includes('--verbose') || args.includes('-v');
const bail = args.includes('--bail');

let targetTiers = [1, 2, 3, 4];
if (tierArg) {
  targetTiers = tierArg
    .split('=')[1]
    .split(',')
    .map(t => parseInt(t.trim(), 10))
    .filter(t => !isNaN(t) && t >= 1 && t <= 4);
}

let filterRegex = null;
if (filterArg) {
  try {
    filterRegex = new RegExp(filterArg.split('=')[1], 'i');
  } catch (e) {
    console.error(`${colors.red}Invalid filter regex: ${e.message}${colors.reset}`);
    process.exit(1);
  }
}

const tiers = [
  { tier: 1, name: 'Tier 1: Feature Coverage', tests: tier1Tests },
  { tier: 2, name: 'Tier 2: Boundary & Corner Cases', tests: tier2Tests },
  { tier: 3, name: 'Tier 3: Cross-Feature Combinations', tests: tier3Tests },
  { tier: 4, name: 'Tier 4: Real-World Workload Scenarios', tests: tier4Tests }
];

async function main() {
  const startTime = Date.now();
  console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}            HOSHINOTE E2E OPAQUE-BOX TEST RUNNER                     ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.dim}Target Engine: ${process.env.HOSHINOTE_E2E_TARGET || 'Reference Oracle (PROJECT.md Specification)'}${colors.reset}`);
  console.log(`${colors.dim}Active Tiers:  ${targetTiers.join(', ')}${colors.reset}\n`);

  let totalExecuted = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failureReports = [];
  const tierSummaries = [];

  for (const tierObj of tiers) {
    if (!targetTiers.includes(tierObj.tier)) continue;

    console.log(`${colors.bold}${colors.blue}▶ ${tierObj.name}${colors.reset}`);
    let tierPassed = 0;
    let tierFailed = 0;

    let tierTests = tierObj.tests;
    if (filterRegex) {
      tierTests = tierTests.filter(t => filterRegex.test(t.id) || filterRegex.test(t.name) || filterRegex.test(t.category));
    }

    for (const test of tierTests) {
      totalExecuted++;
      const testStart = Date.now();
      try {
        await test.run();
        const duration = Date.now() - testStart;
        tierPassed++;
        totalPassed++;
        console.log(`  ${colors.green}✔${colors.reset} ${colors.bold}[${test.id}]${colors.reset} ${test.name} ${colors.dim}(${duration}ms)${colors.reset}`);
      } catch (err) {
        const duration = Date.now() - testStart;
        tierFailed++;
        totalFailed++;
        console.log(`  ${colors.red}✖${colors.reset} ${colors.bold}[${test.id}]${colors.reset} ${test.name} ${colors.dim}(${duration}ms)${colors.reset}`);
        failureReports.push({
          tier: tierObj.tier,
          id: test.id,
          name: test.name,
          category: test.category,
          error: err
        });

        if (verbose) {
          console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
          if (err.stack) console.log(`    ${colors.dim}${err.stack.split('\n').slice(1, 4).join('\n    ')}${colors.reset}`);
        }

        if (bail) {
          console.log(`\n${colors.yellow}Bailing out due to failure (--bail flag set)${colors.reset}`);
          break;
        }
      }
    }

    tierSummaries.push({
      tier: tierObj.tier,
      name: tierObj.name,
      total: tierTests.length,
      passed: tierPassed,
      failed: tierFailed
    });
    console.log();

    if (bail && tierFailed > 0) break;
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print Summary Table
  console.log(`${colors.bold}─────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}                       TEST RUN SUMMARY                              ${colors.reset}`);
  console.log(`${colors.bold}─────────────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.dim}Tier / Suite                               Total    Passed    Failed${colors.reset}`);

  for (const s of tierSummaries) {
    const padName = s.name.padEnd(40, ' ');
    const padTotal = String(s.total).padStart(6, ' ');
    const padPassed = `${colors.green}${String(s.passed).padStart(7, ' ')}${colors.reset}`;
    const padFailed = s.failed > 0
      ? `${colors.red}${String(s.failed).padStart(8, ' ')}${colors.reset}`
      : `${colors.dim}${String(s.failed).padStart(8, ' ')}${colors.reset}`;
    console.log(`${padName}${padTotal} ${padPassed} ${padFailed}`);
  }

  console.log(`${colors.bold}─────────────────────────────────────────────────────────────────────${colors.reset}`);
  const passPercent = totalExecuted > 0 ? ((totalPassed / totalExecuted) * 100).toFixed(1) : '0';
  console.log(`Total: ${totalExecuted} tests | Passed: ${colors.green}${totalPassed}${colors.reset} | Failed: ${totalFailed > 0 ? colors.red : colors.dim}${totalFailed}${colors.reset} | Pass Rate: ${colors.bold}${passPercent}%${colors.reset} (${elapsedSec}s)`);

  if (failureReports.length > 0) {
    console.log(`\n${colors.bold}${colors.red}FAILURES REPORT (${failureReports.length}):${colors.reset}`);
    for (const f of failureReports) {
      console.log(`\n${colors.red}● [${f.id}] ${f.name}${colors.reset}`);
      console.log(`  Tier: ${f.tier} | Category: ${f.category}`);
      console.log(`  ${colors.bold}Message:${colors.reset} ${f.error.message}`);
      if (f.error.actual !== undefined && f.error.expected !== undefined) {
        console.log(`  ${colors.dim}Actual:   ${JSON.stringify(f.error.actual)}${colors.reset}`);
        console.log(`  ${colors.dim}Expected: ${JSON.stringify(f.error.expected)}${colors.reset}`);
      }
      if (f.error.stack) {
        console.log(`  ${colors.dim}Stack:\n    ${f.error.stack.split('\n').slice(1, 4).join('\n    ')}${colors.reset}`);
      }
    }
    console.log(`\n${colors.bgRed}${colors.white}${colors.bold} FAILED ${colors.reset} ${totalFailed} test(s) failed.\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.bgGreen}${colors.white}${colors.bold} SUCCESS ${colors.reset} All ${totalPassed} E2E tests passed successfully.\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`\n${colors.red}Fatal runner error: ${err.message}${colors.reset}`);
  console.error(err.stack);
  process.exit(1);
});
