import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { unpackStateFile } from '../src/loan-pack.js';
import { readPublishedPayload } from '../src/published.js';
import { summarize } from '../src/summarize.js';

test('the Nevada loan file matches the published Clark County totals', () => {
  const file = JSON.parse(readFileSync(new URL('../data/loans/NV.json', import.meta.url), 'utf8'));
  const summary = summarize(unpackStateFile(file), { states: ['NV'], counties: ['CLARK|NV'] });
  const published = readPublishedPayload();
  assert.equal(summary.kpis.total_loans, published.kpis.total_loans);
  assert.equal(summary.kpis.acquisition_loans, published.kpis.acquisition_loans);
  assert.equal(summary.kpis.total_approved_usd, published.kpis.total_approved_usd);
  assert.equal(summary.kpis.jobs_supported, published.kpis.jobs_supported);
  assert.equal(summary.sub1m_acq.count, published.sub1m_acq.count);
});
