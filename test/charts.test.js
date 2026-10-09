import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { acquisitionIndustryListHtml, chargeOffBucket, indexHover, lineHover, monthTooltipLabel, rankAcquisitionIndustries } from '../src/charts.js';
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

test('acquisition industries rank by charge-off rate and keep loan-count bars', () => {
  const rows = [
    { code: '811', desc: 'General Automotive Repair', n: 100, chgoff_rate: 0 },
    { code: '238', desc: 'Plumbing, Heating, and Air-Conditioning Contractors', n: 3000, chgoff_rate: 3.37 },
    { code: '541', desc: 'Offices of Lawyers', n: 200, chgoff_rate: 7.96 },
    { code: '445', desc: 'Beer, Wine, and Liquor Retailers', n: 400, chgoff_rate: 2.12 },
    { code: '561', desc: 'Landscaping Services', n: 150, chgoff_rate: 3.83 },
    { code: '812', desc: 'Drycleaning and Laundry Services (except Coin-Operated)', n: 80, chgoff_rate: 5.06 },
    { code: '621', desc: 'Home Health Care Services', n: 90, chgoff_rate: 6 },
    { code: '524', desc: 'Insurance Agencies and Brokerages', n: 70, chgoff_rate: 6.9 },
    { code: '713', desc: 'Fitness and Recreational Sports Centers', n: 60, chgoff_rate: 2.86 },
    { code: '624', desc: 'Child Care Services', n: 50, chgoff_rate: 5 },
    { code: '424', desc: 'General Line Grocery Merchant Wholesalers', n: 40, chgoff_rate: 8.7 },
    { code: '442', desc: 'Furniture Stores', n: 5000, chgoff_rate: null },
    { code: '423', desc: 'Other Electronic Parts and Equipment Merchant Wholesalers', n: 30, chgoff_rate: 16.67 },
    { code: '721', desc: 'Hotels (except Casino Hotels) and Motels', n: 1, chgoff_rate: 0 },
  ];
  const ranked = rankAcquisitionIndustries(rows);
  assert.deepEqual(ranked.map((row) => row.code), [
    '811', '445', '713', '238', '561', '624', '812', '621', '524', '541', '424', '442',
  ]);
  assert.equal(ranked.some((row) => row.code === '721'), false);
  assert.equal(ranked.at(-1).chgoff_rate, null);
  assert.equal(chargeOffBucket(5), 'good');
  assert.equal(chargeOffBucket(5.01), 'warn');
  assert.equal(chargeOffBucket(8), 'warn');
  assert.equal(chargeOffBucket(8.01), 'bad');
  assert.equal(chargeOffBucket(null), 'volume');

  const html = acquisitionIndustryListHtml(rows);
  assert.match(html, /data-sector="23"/);
  assert.match(html, /Professional, Scientific, and Technical Services/);
  assert.match(html, /Amusement, Gambling, and Recreation Industries/);
  assert.match(html, /Furniture and Home Furnishings Stores/);
  assert.equal(html.includes('…'), false);
  assert.equal(html.includes('...'), false);
  const repair = html.indexOf('Repair and Maintenance');
  const specialty = html.indexOf('Specialty Trade Contractors');
  const furniture = html.indexOf('Furniture and Home Furnishings Stores');
  assert.equal(repair < specialty && specialty < furniture, true);
  assert.match(html, /bucket-good" style="width:2\.00%"/);
  assert.match(html, /bucket-warn" style="width:1\.60%"/);
  assert.match(html, /bucket-bad" style="width:0\.80%"/);
  assert.match(html, /bucket-volume" style="width:100\.00%"/);
  assert.match(html, /Charge-off 0%/);
  assert.match(html, /3,000 loans/);
  assert.match(html, /5,000 acquisition loans/);
  assert.match(html, /Charge-off —/);
  const nasty = acquisitionIndustryListHtml([
    { code: '999', desc: 'Repair <img alt="x" onerror="alert(1)">', n: 4, chgoff_rate: 1 },
  ]);
  assert.equal(nasty.includes('<img'), false);
  assert.match(nasty, /Repair &lt;img alt=&quot;x&quot; onerror=&quot;alert\(1\)&quot;&gt;/);

  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /class="industry-rank"/);
  assert.match(page, /id="acqIndustryChart"/);
  assert.match(page, /acquisitionIndustryListHtml\(DATA\.acq_industries, industrySort\)/);
  assert.match(page, /Acquisition industries are ordered by charge-off rate, lowest first\. Missing rates sort last\./);
  assert.match(page, /Charge-off 5% or less/);
  assert.match(page, /Bar length is the number of acquisition loans\./);
  assert.equal(page.includes('name.slice(0, 40)'), false);
  assert.equal(page.includes('<canvas id="acqIndustryChart">'), false);
});

test('acquisition industry sorts reorder the same rows', () => {
  const rows = [
    { code: '811', desc: 'General Automotive Repair', n: 100, chgoff_rate: 0 },
    { code: '238', desc: 'Plumbing, Heating, and Air-Conditioning Contractors', n: 3000, chgoff_rate: 3.37 },
    { code: '541', desc: 'Offices of Lawyers', n: 200, chgoff_rate: 7.96 },
    { code: '445', desc: 'Beer, Wine, and Liquor Retailers', n: 400, chgoff_rate: 2.12 },
    { code: '561', desc: 'Landscaping Services', n: 150, chgoff_rate: 3.83 },
    { code: '812', desc: 'Drycleaning and Laundry Services (except Coin-Operated)', n: 80, chgoff_rate: 5.06 },
    { code: '621', desc: 'Home Health Care Services', n: 90, chgoff_rate: 6 },
    { code: '524', desc: 'Insurance Agencies and Brokerages', n: 70, chgoff_rate: 6.9 },
    { code: '713', desc: 'Fitness and Recreational Sports Centers', n: 60, chgoff_rate: 2.86 },
    { code: '624', desc: 'Child Care Services', n: 50, chgoff_rate: 5 },
    { code: '424', desc: 'General Line Grocery Merchant Wholesalers', n: 40, chgoff_rate: 8.7 },
    { code: '442', desc: 'Furniture Stores', n: 5000, chgoff_rate: null },
    { code: '423', desc: 'Other Electronic Parts and Equipment Merchant Wholesalers', n: 30, chgoff_rate: 16.67 },
    { code: '721', desc: 'Hotels (except Casino Hotels) and Motels', n: 1, chgoff_rate: 0 },
  ];
  const codes = (sort) => rankAcquisitionIndustries(rows, undefined, sort).map((row) => row.code);
  const lowest = ['811', '445', '713', '238', '561', '624', '812', '621', '524', '541', '424', '442'];
  assert.deepEqual(codes(), lowest);
  assert.deepEqual(codes('chargeoff-asc'), lowest);
  assert.deepEqual(codes('not-a-sort'), lowest);
  assert.deepEqual(codes('chargeoff-desc'), ['424', '541', '524', '621', '812', '624', '561', '238', '713', '445', '811', '442']);
  assert.deepEqual(codes('loans-desc'), ['442', '238', '445', '541', '561', '811', '621', '812', '524', '713', '624', '424']);
  assert.deepEqual(codes('loans-asc'), ['424', '624', '713', '524', '812', '621', '811', '561', '541', '445', '238', '442']);
  assert.deepEqual(codes('name-asc'), ['561', '621', '713', '445', '442', '524', '424', '812', '541', '811', '624', '238']);
  assert.deepEqual(codes('name-desc'), ['238', '624', '811', '541', '812', '424', '524', '442', '445', '713', '621', '561']);
  for (const sort of ['chargeoff-desc', 'loans-desc', 'loans-asc', 'name-asc', 'name-desc']) {
    assert.deepEqual([...codes(sort)].sort(), [...lowest].sort());
    assert.equal(codes(sort).includes('721'), false);
    assert.equal(codes(sort).includes('423'), false);
  }
  assert.equal(codes('chargeoff-asc').at(-1), '442');
  assert.equal(codes('chargeoff-desc').at(-1), '442');

  const missing = [
    { code: '811', desc: 'Repair', n: 5, chgoff_rate: 1 },
    { code: '442', desc: 'Furniture', n: 9, chgoff_rate: null },
    { code: '623', desc: 'Nursing', n: 4, chgoff_rate: '' },
    { code: '238', desc: 'Specialty', n: 8, chgoff_rate: 4 },
  ];
  assert.deepEqual(rankAcquisitionIndustries(missing, 12, 'chargeoff-asc').map((row) => row.code), ['811', '238', '442', '623']);
  assert.deepEqual(rankAcquisitionIndustries(missing, 12, 'chargeoff-desc').map((row) => row.code), ['238', '811', '442', '623']);
  assert.deepEqual(rankAcquisitionIndustries(missing, 3, 'name-asc').map((row) => row.code), ['442', '811', '238']);

  const firstLabel = (sort) => acquisitionIndustryListHtml(rows, sort).match(/^<div class="industry-rank-row" tabindex="0" aria-label="([^."]+)\./)[1];
  assert.equal(firstLabel('chargeoff-asc'), 'Repair and Maintenance');
  assert.equal(firstLabel('chargeoff-desc'), 'Merchant Wholesalers, Nondurable Goods');
  assert.equal(firstLabel('loans-desc'), 'Furniture and Home Furnishings Stores');
  assert.equal(firstLabel('loans-asc'), 'Merchant Wholesalers, Nondurable Goods');
  assert.equal(firstLabel('name-asc'), 'Administrative and Support Services');
  assert.equal(firstLabel('name-desc'), 'Specialty Trade Contractors');
  const byLoans = acquisitionIndustryListHtml(rows, 'loans-desc');
  assert.match(byLoans, /bucket-volume" style="width:100\.00%"/);
  assert.match(byLoans, /bucket-bad" style="width:0\.80%"/);
});
