import { formatChargeOff } from './format.js';
import { escapeHtml, industryMark } from './industry-icon.js';
import { industryName } from './naics.js';

export const lineHover = {
  pointRadius: 0,
  pointHoverRadius: 6,
  pointHoverBorderColor: '#e8ecf7',
  pointHoverBorderWidth: 2,
  pointHitRadius: 12,
};

export const indexHover = { mode: 'index', intersect: false };
export const barHover = { mode: 'nearest', intersect: false };

export function monthTooltipLabel(row, datasetIndex) {
  if (!row) return '';
  if (datasetIndex === 0) return ` All loans: ${row.n}`;
  return ` Acquisitions: ${row.acquisitions}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthTitle(ym) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  if (!match) return String(ym ?? '');
  const name = MONTH_NAMES[Number(match[2]) - 1];
  return name ? `${name} ${match[1]}` : String(ym);
}

// About eighty month labels do not fit. Show the year on the first month
// and again whenever the year changes. The month stays in the hover title.
export function yearTick(label, index, labels) {
  const year = String(label || '').slice(0, 4);
  if (!/^\d{4}$/.test(year)) return '';
  const previous = index > 0 ? String(labels?.[index - 1] || '').slice(0, 4) : '';
  return index === 0 || year !== previous ? year : '';
}

// The list still shows the twelve industries with the most acquisition loans.
// Sort reorders those rows only. The default is charge-off rate, lowest first.
// Industries with no charge-off rate stay at the bottom when sorting by charge-off.
// Loan count sets the bar length, not which industries are included.
export const ACQUISITION_INDUSTRY_ROWS = 12;
export const DEFAULT_INDUSTRY_SORT = 'chargeoff-asc';

function loanCount(row) {
  const count = Number(row?.n);
  return Number.isFinite(count) ? count : 0;
}

function chargeOffValue(row) {
  const rate = row?.chgoff_rate;
  if (rate == null || rate === '') return null;
  const number = Number(rate);
  return Number.isFinite(number) ? number : null;
}

export function chargeOffBucket(rate) {
  const number = chargeOffValue({ chgoff_rate: rate });
  if (number == null) return 'volume';
  if (number <= 5) return 'good';
  if (number <= 8) return 'warn';
  return 'bad';
}

function compareName(a, b) {
  return industryName(a.code, a.desc).localeCompare(industryName(b.code, b.desc))
    || String(a.code).localeCompare(String(b.code));
}

function compareChargeOff(a, b, direction) {
  const aRate = chargeOffValue(a);
  const bRate = chargeOffValue(b);
  if (aRate == null && bRate == null) return compareName(a, b);
  if (aRate == null) return 1;
  if (bRate == null) return -1;
  if (aRate !== bRate) return direction * (aRate - bRate);
  return compareName(a, b);
}

function compareAcquisitionIndustries(a, b, sort) {
  if (sort === 'chargeoff-desc') return compareChargeOff(a, b, -1);
  if (sort === 'loans-desc') return loanCount(b) - loanCount(a) || compareName(a, b);
  if (sort === 'loans-asc') return loanCount(a) - loanCount(b) || compareName(a, b);
  if (sort === 'name-asc') return compareName(a, b);
  if (sort === 'name-desc') return compareName(b, a);
  return compareChargeOff(a, b, 1);
}

export function rankAcquisitionIndustries(rows, limit = ACQUISITION_INDUSTRY_ROWS, sort = DEFAULT_INDUSTRY_SORT) {
  const selected = [...(rows || [])].sort((a, b) => {
    const byCount = loanCount(b) - loanCount(a);
    if (byCount) return byCount;
    return String(a.desc || '').localeCompare(String(b.desc || ''));
  }).slice(0, limit);

  return selected.sort((a, b) => compareAcquisitionIndustries(a, b, sort));
}

export function acquisitionIndustryListHtml(rows, sort = DEFAULT_INDUSTRY_SORT) {
  const ranked = rankAcquisitionIndustries(rows, ACQUISITION_INDUSTRY_ROWS, sort);
  const max = Math.max(1, ...ranked.map((row) => loanCount(row)));
  return ranked.map((row) => {
    const name = industryName(row.code, row.desc);
    const rate = formatChargeOff(row.chgoff_rate);
    const count = loanCount(row).toLocaleString('en-US');
    const width = ((loanCount(row) / max) * 100).toFixed(2);
    const bucket = chargeOffBucket(row.chgoff_rate);
    const safeName = escapeHtml(name);
    return `<div class="industry-rank-row" tabindex="0" aria-label="${safeName}. Charge-off ${rate}. ${count} acquisition loans.">`
      + `${industryMark(name, row.code)}`
      + `<span class="industry-rank-rate">${rate}</span>`
      + `<span class="industry-rank-track" aria-hidden="true"><span class="industry-rank-bar bucket-${bucket}" style="width:${width}%"></span></span>`
      + `<span class="industry-rank-count">${count} loans</span>`
      + `<span class="industry-pop" role="tooltip" hidden><strong>${safeName}</strong>Charge-off ${rate}<span>${count} acquisition loans</span></span>`
      + `</div>`;
  }).join('');
}
