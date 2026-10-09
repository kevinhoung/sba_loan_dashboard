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
  assert.match(page, /--bg: #0b1020/);
  assert.match(page, /\[data-theme="light"\] \{\s*color-scheme: light;\s*--bg: #f6f7f9;/);
  assert.match(page, /button\.gridjs-sort \{ float: none !important; display: inline-block !important; vertical-align: -4px; margin: 0 0 0 12px !important; \}/);
  assert.match(page, /<button type="button" class="tab active"/);
  assert.match(page, /\.tab:hover \{ background: var\(--panel2\); \}/);
  assert.match(page, /\.kpi \{ padding: 2px 22px;/);
  assert.match(page, /Charged Off \(CHGOFF\) means the lender wrote off the loan balance as a loss/);
  assert.match(page, /SBA does not publish a Distress status/);
  assert.match(page, /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/);
  assert.equal(page.split("termHeader('Charge-off'").length - 1, 3);
  assert.equal(page.split("termHeader('Distress'").length - 1, 2);
  assert.match(page, /The latest 5 change-of-ownership loans/);
  assert.equal(page.includes('The latest 50'), false);
  assert.match(page, /Borrower cities inside the selected county/);
  assert.match(page, /import \{ formatRate, sizeChartLabel \} from '\.\/src\/format\.js'/);
  assert.equal(page.split('pagination: { limit: PAGE_ROWS }').length - 1, 7);
  assert.equal(page.includes('All Acquisition Lenders</h2>\n    <div id="acqLendersGrid"'), true);
  assert.equal(/<div class="row2">[\s\S]{0,400}All Acquisition Lenders/.test(page), false);
});

test('the document title is SBA Dashboard and a favicon is linked', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const title = page.match(/<title>([^<]*)<\/title>/);
  assert.equal(title && title[1], 'SBA Dashboard');
  assert.match(page, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml"/);
  assert.match(page, /<link rel="icon" href="favicon\.png" type="image\/png"/);
});
