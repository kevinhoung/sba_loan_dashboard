import assert from 'node:assert/strict';
import test from 'node:test';
import {
  businessAgeGroup,
  eligibleLoans,
  isCancelled,
  isDistressed,
  isRestaurant,
  normalizeRow,
  normalizeStatus,
  parseCsv,
  rowsToRecords,
  statusLabel,
} from '../src/normalize.js';

test('parseCsv keeps commas that are inside quotes', () => {
  const rows = parseCsv('Name,City\n"Bank, National Association","Las Vegas"\n');
  assert.deepEqual(rows, [
    ['Name', 'City'],
    ['Bank, National Association', 'Las Vegas'],
  ]);
});

test('parseCsv unescapes doubled quotes', () => {
  const rows = parseCsv('"He said ""hello""",NV\n');
  assert.deepEqual(rows, [['He said "hello"', 'NV']]);
});

test('rowsToRecords maps the SBA header row', () => {
  const csv = [
    '"AsOfDate","Program","BorrCity","ProjectCounty","ProjectState","LoanStatus","NaicsCode","GrossApproval"',
    '"2026-06-30"," 7A","Las Vegas","CLARK","NV","P I F","722511","25000.0"',
  ].join('\n');
  const [record] = rowsToRecords(csv);
  assert.equal(record.BorrCity, 'Las Vegas');
  assert.equal(record.LoanStatus, 'P I F');
  assert.equal(record.NaicsCode, '722511');
});

test('normalizeRow reads an SBA 7(a) row', () => {
  const loan = normalizeRow({
    Program: ' 7A',
    BorrCity: 'Las Vegas',
    BorrState: 'NV',
    BankName: 'Zions Bank, A Division of',
    GrossApproval: '25000.0',
    ApprovalDate: '2024-03-02',
    ApprovalFY: '2024',
    InitialInterestRate: '9.5',
    TermInMonths: '120.0',
    NaicsCode: '811111',
    NaicsDescription: 'General Automotive Repair ',
    ProjectCounty: 'CLARK',
    ProjectState: 'NV',
    BusinessAge: 'Change of Ownership',
    LoanStatus: 'P I F',
    GrossChargeOffAmount: '0.0',
    JobsSupported: '5.0',
  });
  assert.equal(loan.program, '7A');
  assert.equal(loan.grossApproval, 25000);
  assert.equal(loan.termMonths, 120);
  assert.equal(loan.jobs, 5);
  assert.equal(loan.status, 'PIF');
  assert.equal(loan.naicsDescription, 'General Automotive Repair');
  assert.equal(loan.interestRate, 9.5);
});

test('status codes ignore spaces and spelling variants', () => {
  assert.equal(normalizeStatus('P I F'), 'PIF');
  assert.equal(normalizeStatus('CANCLD'), 'CANCLD');
  assert.equal(normalizeStatus('Cancelled'), 'CANCLD');
  assert.equal(normalizeStatus('CHGOFF'), 'CHGOFF');
  assert.equal(statusLabel('EXEMPT'), 'Current');
  assert.equal(statusLabel('PIF'), 'Paid In Full');
});

test('restaurants are NAICS 722 and cancelled loans are CANCLD', () => {
  assert.equal(isRestaurant({ naics: '722511' }), true);
  assert.equal(isRestaurant({ naics: '722' }), true);
  assert.equal(isRestaurant({ naics: '811111' }), false);
  assert.equal(isCancelled({ status: 'CANCLD' }), true);
  assert.equal(isCancelled({ status: 'EXEMPT' }), false);
});

test('business age groups match the SBA categories', () => {
  assert.equal(businessAgeGroup({ businessAge: 'Change of Ownership' }), 'acquisition');
  assert.equal(businessAgeGroup({ businessAge: 'Startup, Loan Funds will Open Business' }), 'startup');
  assert.equal(businessAgeGroup({ businessAge: 'Existing or more than 2 years old' }), 'existing');
  assert.equal(businessAgeGroup({ businessAge: 'New Business or 2 years or less' }), 'new');
  assert.equal(businessAgeGroup({ businessAge: 'Unanswered' }), 'other');
});

test('distress includes charge-offs, undisbursed loans, and a charge-off amount', () => {
  assert.equal(isDistressed({ status: 'CHGOFF', grossChargeOff: 0 }), true);
  assert.equal(isDistressed({ status: 'COMMIT', grossChargeOff: 0 }), true);
  assert.equal(isDistressed({ status: 'EXEMPT', grossChargeOff: 100 }), true);
  assert.equal(isDistressed({ status: 'EXEMPT', grossChargeOff: 0 }), false);
  assert.equal(isDistressed({ status: 'PIF', grossChargeOff: 0 }), false);
});

test('eligible loans drop restaurants, cancellations, and non-7(a) programs', () => {
  const loans = [
    { program: '7A', naics: '811111', status: 'EXEMPT' },
    { program: '7A', naics: '722511', status: 'EXEMPT' },
    { program: '7A', naics: '811111', status: 'CANCLD' },
    { program: '504', naics: '811111', status: 'EXEMPT' },
  ];
  assert.equal(eligibleLoans(loans).length, 1);
});
