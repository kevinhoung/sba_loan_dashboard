import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { median, monthlyPayment, percent, sectorName, sizeBucket, summarize } from '../src/summarize.js';
import { loan } from './helpers.js';

test('a standard loan payment uses the monthly rate and term', () => {
  const payment = monthlyPayment(350000, 8.6, 120);
  assert.equal(Math.round(payment), 4358);
});

test('median and percent use the standard middle value and two decimals', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(percent(4, 121), 3.31);
  assert.equal(percent(2, 43), 4.65);
  assert.equal(percent(0, 0), null);
});

test('missing NAICS sectors use short official names', () => {
  const official = {
    11: 'Agriculture, Forestry, Fishing',
    21: 'Mining and Oil & Gas',
    22: 'Utilities',
    55: 'Management of Companies',
    72: 'Accommodation and Food Services',
    92: 'Public Administration',
  };
  for (const [code, name] of Object.entries(official)) {
    assert.equal(sectorName(code), name);
    assert.equal(sectorName(`${code}110`), name);
    assert.equal(/^NAICS \d+/.test(name), false, name);
    assert.equal(sectorName(code).includes(`NAICS ${code}`), false);
  }
  assert.equal(sectorName('31'), 'Manufacturing (Food/Textile)');
  assert.equal(sectorName('32'), 'Manufacturing (Wood/Chem/Plastic)');
  assert.equal(sectorName('44'), 'Retail (Auto/Furn/Home)');
  assert.equal(sectorName('45'), 'Retail (General/Misc)');
});

test('every two-digit code in the loan files has a sector name', () => {
  const codes = new Set();
  const directory = new URL('../data/loans/', import.meta.url);
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    const packed = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
    for (const row of packed.loans || []) {
      const digits = String(row[8] ?? '').replace(/\D/g, '');
      if (digits.length >= 2) codes.add(digits.slice(0, 2));
    }
  }
  for (const code of ['11', '21', '22', '55', '72', '92']) assert.equal(codes.has(code), true, code);
  for (const code of codes) {
    const name = sectorName(`${code}0000`);
    assert.equal(/^NAICS \d+/.test(name), false, `${code} -> ${name}`);
  }
});

test('loan size buckets treat the labeled edge as the start of the next bucket', () => {
  assert.equal(sizeBucket(49999), '<$50K');
  assert.equal(sizeBucket(50000), '$50K-$150K');
  assert.equal(sizeBucket(999999), '$500K-$1M');
  assert.equal(sizeBucket(1000000), '$1M-$2M');
  assert.equal(sizeBucket(2000000), '$2M+');
});

test('restaurants and cancelled loans stay out of the totals', () => {
  const summary = summarize([
    loan({ grossApproval: 100000, jobs: 2 }),
    loan({ naics: '722511', naicsDescription: 'Full-Service Restaurants', grossApproval: 999999, jobs: 40 }),
    loan({ status: 'CANCLD', grossApproval: 888888, jobs: 30 }),
  ]);
  assert.equal(summary.kpis.total_loans, 1);
  assert.equal(summary.kpis.total_approved_usd, 100000);
  assert.equal(summary.kpis.jobs_supported, 2);
});

test('charge-off rate uses only FY2020-2023 loans and ignores a later charge-off', () => {
  const seasoned = Array.from({ length: 8 }, (_, index) => loan({
    approvalFy: 2021,
    approvalDate: '2021-05-01',
    status: index === 0 ? 'CHGOFF' : 'EXEMPT',
    naics: '238220',
    naicsDescription: 'Plumbing, Heating, and Air-Conditioning Contractors',
  }));
  const later = loan({
    approvalFy: 2025,
    approvalDate: '2025-05-01',
    status: 'CHGOFF',
    naics: '238220',
    naicsDescription: 'Plumbing, Heating, and Air-Conditioning Contractors',
  });
  const summary = summarize([...seasoned, later]);
  assert.equal(summary.sectors[0].n, 8);
  assert.equal(summary.sectors[0].chgoff_rate, 12.5);
  assert.equal(summary.kpis.total_loans, 9);
});

test('industries below 8 seasoned loans are left out of the sector tables', () => {
  const loans = Array.from({ length: 7 }, () => loan({ approvalFy: 2022, naics: '541110' }));
  const summary = summarize(loans);
  assert.equal(summary.sectors.length, 0);
  assert.equal(summary.naics3.length, 0);
  assert.equal(summary.kpis.total_loans, 7);
});

test('sub-$1M acquisitions are strictly below one million', () => {
  const summary = summarize([
    loan({ businessAge: 'Change of Ownership', grossApproval: 999999, interestRate: 8, termMonths: 120 }),
    loan({ businessAge: 'Change of Ownership', grossApproval: 1000000, interestRate: 10, termMonths: 60 }),
  ]);
  assert.equal(summary.kpis.acquisition_loans, 2);
  assert.equal(summary.sub1m_acq.count, 1);
  assert.equal(summary.sub1m_acq.median_loan, 999999);
});

test('a missing month stays in the trend with zero loans', () => {
  const summary = summarize([
    loan({ approvalDate: '2025-09-15', approvalFy: 2025 }),
    loan({ approvalDate: '2025-11-02', approvalFy: 2026, businessAge: 'Change of Ownership' }),
  ]);
  assert.deepEqual(summary.monthly_trend.map((month) => month.ym), ['2025-09', '2025-10', '2025-11']);
  assert.equal(summary.monthly_trend[1].n, 0);
  assert.equal(summary.monthly_trend[1].acquisitions, 0);
  assert.equal(summary.monthly_trend[2].acquisitions, 1);
});

test('startup and existing counts follow the business-age wording', () => {
  const summary = summarize([
    loan({ businessAge: 'Startup, Loan Funds will Open Business' }),
    loan({ businessAge: 'New Business or 2 years or less' }),
    loan({ businessAge: 'Existing or more than 2 years old' }),
    loan({ businessAge: 'Change of Ownership' }),
    loan({ businessAge: 'Unanswered' }),
  ]);
  assert.equal(summary.kpis.startup_loans, 1);
  assert.equal(summary.kpis.existing_business_loans, 1);
  assert.equal(summary.kpis.acquisition_loans, 1);
  assert.equal(summary.kpis.total_loans, 5);
});

test('interest averages skip loans with no rate', () => {
  const summary = summarize([
    loan({ interestRate: 10 }),
    loan({ interestRate: null }),
  ]);
  assert.equal(summary.kpis.avg_interest_rate, 10);
});

test('selecting two cities counts each matching loan once', () => {
  const loans = [
    loan({ borrowerCity: 'Las Vegas', grossApproval: 100000 }),
    loan({ borrowerCity: 'Henderson', grossApproval: 200000 }),
    loan({ borrowerCity: 'Reno', projectCounty: 'WASHOE', grossApproval: 300000 }),
  ];
  const summary = summarize(loans, {
    states: ['NV'],
    counties: ['CLARK|NV'],
    cities: ['LAS VEGAS|CLARK|NV', 'HENDERSON|CLARK|NV'],
  });
  assert.equal(summary.kpis.total_loans, 2);
  assert.equal(summary.kpis.total_approved_usd, 300000);
});

test('an out-of-state borrower stays in the project county totals and stays out of the city breakdown', () => {
  const summary = summarize([
    loan({ borrowerCity: 'Las Vegas', borrowerState: 'NV', grossApproval: 200000 }),
    loan({ borrowerCity: 'Brentwood', borrowerState: 'CA', grossApproval: 120000 }),
    loan({ borrowerCity: 'Canyonville', borrowerState: 'OR', grossApproval: 295700 }),
    loan({ borrowerCity: 'Orlando', borrowerState: 'FL', businessAge: 'Change of Ownership', grossApproval: 2913000 }),
    loan({ borrowerCity: 'Henderson', borrowerState: '', grossApproval: 50000 }),
  ], { states: ['NV'], counties: ['CLARK|NV'] });
  assert.equal(summary.kpis.total_loans, 5);
  assert.equal(summary.kpis.total_approved_usd, 200000 + 120000 + 295700 + 2913000 + 50000);
  assert.equal(summary.kpis.acquisition_loans, 1);
  assert.deepEqual(summary.cities.map((row) => row.city), ['Las Vegas']);
  assert.equal(summary.cities[0].n, 1);
  assert.equal(summary.cities.some((row) => row.city === 'Brentwood, CA'), false);
  assert.equal(summary.cities.some((row) => row.city === 'Canyonville, OR'), false);
  assert.equal(summary.acquisitions.by_city['Orlando, FL'], 1);
});

test('recent acquisitions keep only the five latest loans', () => {
  const loans = Array.from({ length: 8 }, (_, index) => loan({
    businessAge: 'Change of Ownership',
    approvalDate: `2024-0${index + 1}-15`,
    grossApproval: (index + 1) * 1000,
  }));
  const summary = summarize(loans);
  assert.equal(summary.kpis.acquisition_loans, 8);
  assert.equal(summary.recent_acq.length, 5);
  assert.equal(summary.recent_acq[0].date, '2024-08-15');
  assert.equal(summary.recent_acq[4].date, '2024-04-15');
});

test('an Orlando borrower is not a Clark County loan when the project is somewhere else', () => {
  const summary = summarize([
    loan({ borrowerCity: 'Orlando', projectCounty: 'ORANGE', projectState: 'FL' }),
    loan({ borrowerCity: 'Las Vegas' }),
  ], { states: ['NV'], counties: ['CLARK|NV'] });
  assert.equal(summary.kpis.total_loans, 1);
  assert.equal(summary.cities[0].city, 'Las Vegas');
});

test('the build script writes a payload from a loan file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sba-build-'));
  const input = join(directory, 'loans.json');
  const output = join(directory, 'payload.json');
  writeFileSync(input, JSON.stringify([
    {
      Program: ' 7A',
      BorrCity: 'Henderson',
      BorrState: 'NV',
      BankName: 'Example Bank',
      GrossApproval: '150000.0',
      ApprovalDate: '2023-01-10',
      ApprovalFY: '2023',
      InitialInterestRate: '8.5',
      TermInMonths: '120.0',
      NaicsCode: '561730',
      NaicsDescription: 'Landscaping Services',
      ProjectCounty: 'CLARK',
      ProjectState: 'NV',
      BusinessAge: 'Change of Ownership',
      LoanStatus: 'EXEMPT',
      GrossChargeOffAmount: '0',
      JobsSupported: '4',
    },
    {
      Program: ' 7A',
      BorrCity: 'Las Vegas',
      ProjectCounty: 'CLARK',
      ProjectState: 'NV',
      NaicsCode: '722511',
      LoanStatus: 'EXEMPT',
      GrossApproval: '500000',
      ApprovalDate: '2023-01-11',
      ApprovalFY: '2023',
      BusinessAge: 'Existing or more than 2 years old',
    },
  ]));
  const result = spawnSync(process.execPath, ['scripts/build.js', input, output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(payload.kpis.total_loans, 1);
  assert.equal(payload.kpis.acquisition_loans, 1);
  assert.equal(payload.kpis.fy_range, '2023-2023 (through Jan 2023)');
  rmSync(directory, { recursive: true, force: true });
});
