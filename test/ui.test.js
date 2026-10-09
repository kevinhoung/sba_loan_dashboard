import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the opening view leads with acquisition totals up to $5 million', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(page.includes('sub-$1M'), false);
  assert.equal(page.includes('Sub-$1M'), false);
  assert.match(page, /These loans run up to \$5 million/);
  assert.match(page, /id="dealNote"/);
  assert.match(page, /id="topLenders"/);
  assert.match(page, /id="themeToggle"/);
  assert.match(page, /localStorage\.getItem\('sba-theme'\)/);
  assert.match(page, /\.picker\.open \.options \{ display: block; \}/);
  assert.match(page, /Typical acquisition/);
  assert.match(page, /<h1>SBA Acquisitions<\/h1>/);
  assert.match(page, /<h2>Acquisition Industries<\/h2>/);
  assert.match(page, /<h2>Monthly Approvals<\/h2>/);
  assert.match(page, /<button type="button" class="tab active"/);
  assert.match(page, /\.tab:hover \{ background: var\(--panel2\); \}/);
  assert.match(page, /\.kpi \{ padding: 2px 22px;/);
});
