import assert from 'node:assert/strict';
import test from 'node:test';
import { readPublishedPayload } from '../src/published.js';

const payload = readPublishedPayload();

test('the published dashboard keeps the March 2026 Clark County headline numbers', () => {
  assert.equal(payload.kpis.total_loans, 2107);
  assert.equal(payload.kpis.total_approved_usd, 1098811100);
  assert.equal(payload.kpis.median_loan_usd, 193200);
  assert.equal(payload.kpis.acquisition_loans, 155);
  assert.equal(payload.kpis.startup_loans, 235);
  assert.equal(payload.kpis.existing_business_loans, 1172);
  assert.equal(payload.kpis.avg_interest_rate, 9.09);
  assert.equal(payload.kpis.avg_term_months, 136);
  assert.equal(payload.kpis.unique_lenders, 149);
  assert.equal(payload.kpis.jobs_supported, 22853);
  assert.equal(payload.kpis.fy_range, '2020-2026 (through Mar 2026)');
  assert.equal(payload.sub1m_acq.count, 95);
  assert.equal(payload.sub1m_acq.median_loan, 350000);
  assert.equal(payload.acquisitions.total, 155);
  assert.equal(payload.acquisitions.median_loan, 707000);
});

test('published fiscal-year, monthly, and size counts add up to the same loans', () => {
  const fy = Object.values(payload.kpis.fy_count).reduce((sum, count) => sum + count, 0);
  const months = payload.monthly_trend.reduce((sum, month) => sum + month.n, 0);
  const monthAcquisitions = payload.monthly_trend.reduce((sum, month) => sum + month.acquisitions, 0);
  const acqFy = Object.values(payload.acquisitions.by_fy).reduce((sum, count) => sum + count, 0);
  const sizes = Object.values(payload.size_distribution).reduce((sum, count) => sum + count, 0);
  const acqSizes = Object.values(payload.acq_size_distribution).reduce((sum, count) => sum + count, 0);
  assert.equal(fy, payload.kpis.total_loans);
  assert.equal(months, payload.kpis.total_loans);
  assert.equal(monthAcquisitions, payload.acquisitions.total);
  assert.equal(acqFy, payload.acquisitions.total);
  assert.equal(sizes, payload.kpis.total_loans);
  assert.equal(acqSizes, payload.acquisitions.total);
});

test('published industry rows do not include restaurants', () => {
  const codes = [
    ...payload.naics3.map((row) => row.code),
    ...payload.acq_industries.map((row) => row.code),
    ...payload.recent_acq.map((row) => row.naics),
  ];
  assert.equal(codes.some((code) => String(code).startsWith('722')), false);
});

test('published rates stay inside 0 to 100', () => {
  [...payload.sectors, ...payload.naics3].forEach((row) => {
    for (const key of ['chgoff_rate', 'distress_rate', 'pif_rate']) {
      assert.equal(row[key] >= 0 && row[key] <= 100, true, `${row.sector || row.code} ${key}`);
    }
  });
});

test('the published monthly chart currently skips October 2025 even though the loan totals still balance', () => {
  const months = payload.monthly_trend.map((month) => month.ym);
  assert.equal(months.includes('2025-10'), false);
  assert.equal(months.includes('2025-09'), true);
  assert.equal(months.includes('2025-11'), true);
});
