import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { eligibleLoans, normalizeRow, rowsToRecords } from '../src/normalize.js';
import { stateOption } from '../src/geography.js';

const csvPath = process.argv[2];
const outDir = process.argv[3] || new URL('../data/loans/', import.meta.url).pathname;
if (!csvPath) {
  console.error('Usage: node scripts/export-loans.js <foia.csv> [out-dir]');
  process.exit(1);
}

const loans = eligibleLoans(rowsToRecords(readFileSync(csvPath, 'utf8')).map(normalizeRow));
const byState = new Map();
loans.forEach((loan) => {
  const state = loan.projectState;
  if (!byState.has(state)) byState.set(state, []);
  byState.get(state).push(loan);
});

mkdirSync(outDir, { recursive: true });
const index = [];
for (const [state, rows] of [...byState.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const banks = [];
  const bankId = new Map();
  const descriptions = [];
  const descriptionId = new Map();
  const packed = rows.map((loan) => {
    if (!bankId.has(loan.bankName)) {
      bankId.set(loan.bankName, banks.length);
      banks.push(loan.bankName);
    }
    if (!descriptionId.has(loan.naicsDescription)) {
      descriptionId.set(loan.naicsDescription, descriptions.length);
      descriptions.push(loan.naicsDescription);
    }
    return [
      loan.borrowerCity,
      loan.borrowerState,
      bankId.get(loan.bankName),
      loan.grossApproval,
      loan.approvalDate,
      loan.approvalFy,
      loan.interestRate,
      loan.termMonths,
      loan.naics,
      descriptionId.get(loan.naicsDescription),
      loan.projectCounty,
      loan.projectState,
      loan.businessAge,
      loan.status,
      loan.grossChargeOff,
      loan.jobs,
    ];
  });
  const file = `${state}.json`;
  writeFileSync(join(outDir, file), JSON.stringify({ banks, descriptions, loans: packed }));
  index.push({ ...stateOption(state), file, loans: rows.length });
}

writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(index)}\n`);
console.log(JSON.stringify({ states: index.length, loans: loans.length, dir: outDir }, null, 2));
