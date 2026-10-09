import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { indexHover, lineHover, monthTooltipLabel } from '../src/charts.js';
import { fillMonthGaps } from '../src/summarize.js';
import { readPublishedPayload } from '../src/published.js';

test('a month tooltip lists both series at the same point', () => {
  const row = { ym: '2025-10', n: 0, acquisitions: 0 };
  assert.equal(monthTooltipLabel(row, 0), ' All loans: 0');
  assert.equal(monthTooltipLabel(row, 1), ' Acquisitions: 0');
  assert.equal(indexHover.mode, 'index');
  assert.equal(indexHover.intersect, false);
  assert.equal(lineHover.pointRadius, 0);
  assert.equal(lineHover.pointHoverRadius, 6);
});

test('the published October gap is filled before the chart draws it', () => {
  const filled = fillMonthGaps(readPublishedPayload().monthly_trend);
  const october = filled.find((month) => month.ym === '2025-10');
  assert.equal(october.n, 0);
  assert.equal(october.acquisitions, 0);
});

test('the monthly chart uses the shared hover point and both-series tooltip', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /fillMonthGaps\(DATA\.monthly_trend\)/);
  assert.match(page, /interaction: indexHover/);
  assert.match(page, /monthTooltipLabel\(mt\[ctx\.dataIndex\], ctx\.datasetIndex\)/);
  assert.match(page, /pointHoverRadius: lineHover\.pointHoverRadius/);
  assert.match(page, /id="monthlyLegend"/);
  assert.match(page, /Every eligible SBA 7\(a\) loan approved that month in the place you picked/);
  assert.match(page, /Loans SBA tags Change of Ownership, meaning the money was used to buy an existing business/);
  assert.match(page, /plugins: \{\s*legend: \{ display: false \},\s*tooltip: \{\s*mode: indexHover\.mode/);
});
