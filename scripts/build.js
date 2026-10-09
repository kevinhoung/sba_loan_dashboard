import { readFileSync, writeFileSync } from 'node:fs';
import { eligibleLoans, normalizeRow } from '../src/normalize.js';
import { summarize } from '../src/summarize.js';

export function buildPayload(rows, selection = {}) {
  const loans = eligibleLoans(rows.map(normalizeRow));
  return summarize(loans, selection);
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error('Usage: node scripts/build.js <loans.json> <payload.json>');
    process.exit(1);
  }
  const rows = JSON.parse(readFileSync(input, 'utf8'));
  writeFileSync(output, `${JSON.stringify(buildPayload(rows))}\n`);
}

if (process.argv[1] && process.argv[1].endsWith('build.js')) main();
