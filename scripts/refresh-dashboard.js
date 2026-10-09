import { readFileSync, writeFileSync } from 'node:fs';
import { eligibleLoans, isCancelled, isRestaurant, normalizeRow, rowsToRecords } from '../src/normalize.js';
import { filterLoans } from '../src/geography.js';
import { summarize } from '../src/summarize.js';
import { readPayloadFromHtml } from '../src/published.js';

const csvPath = process.argv[2];
const htmlPath = process.argv[3] || new URL('../index.html', import.meta.url);

if (!csvPath) {
  console.error('Usage: node scripts/refresh-dashboard.js <foia.csv> [index.html]');
  process.exit(1);
}

const csv = readFileSync(csvPath, 'utf8');
const records = rowsToRecords(csv);
const normalized = records.map(normalizeRow).filter((loan) => loan.program === '7A');
const clarkProjects = filterLoans(normalized, { states: ['NV'], counties: ['CLARK|NV'] });
const withoutRestaurants = clarkProjects.filter((loan) => !isRestaurant(loan));
const eligible = eligibleLoans(clarkProjects);
const previous = readPayloadFromHtml(readFileSync(htmlPath, 'utf8'));
const payload = summarize(eligible, {});
payload.benchmarks = previous.benchmarks;

const maxDate = eligible.map((loan) => loan.approvalDate).filter(Boolean).sort().at(-1) || '';
const through = maxDate.slice(0, 7);
const asOf = normalized.find((loan) => loan.asOfDate)?.asOfDate || '2026-06-30';

let html = readFileSync(htmlPath, 'utf8');
html = html.replace(
  /<script id="payload" type="application\/json">[\s\S]*?<\/script>/,
  `<script id="payload" type="application/json">${JSON.stringify(payload)}</script>`,
);

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const [year, month] = through.split('-').map(Number);
const throughLabel = `${monthNames[month - 1]} ${year}`;

html = html.replaceAll('through March 2026', `through ${throughLabel}`);
html = html.replaceAll('as of March 2026', `as of ${throughLabel}`);
html = html.replace(
  /<li><strong>foia-7a-fy2020-present-asof-260331\.csv<\/strong>[\s\S]*?<\/li>/,
  `<li><strong>FOIA_7a_FY2020_Present_asof_260630.csv</strong> — primary dataset. SBA's FOIA release of every 7(a) loan FY2020 through ${throughLabel}. ${normalized.length.toLocaleString('en-US')} rows nationally, ${clarkProjects.length.toLocaleString('en-US')} for Clark County, ${withoutRestaurants.length.toLocaleString('en-US')} after restaurant exclusion, ${eligible.length.toLocaleString('en-US')} after cancelled loans are removed.</li>`,
);
html = html.replaceAll('7a_504_foia_data_dictionary-asof-260331.xlsx', '7a_504_foia_data_dictionary.xlsx');
html = html.replace(
  'All filtering and aggregation pre-computed in Python and embedded as JSON below. Refresh by re-running the build script with a newer FOIA release.',
  'All filtering and aggregation are computed by scripts/refresh-dashboard.js and embedded as JSON below. Refresh by re-running that script with a newer FOIA release.',
);

writeFileSync(htmlPath, html);

const orlando = eligible.filter((loan) => loan.borrowerCity.toUpperCase() === 'ORLANDO');
console.log(JSON.stringify({
  national: normalized.length,
  clarkProjects: clarkProjects.length,
  withoutRestaurants: withoutRestaurants.length,
  eligible: eligible.length,
  cancelledInClark: clarkProjects.filter((loan) => !isRestaurant(loan) && isCancelled(loan)).length,
  acquisitions: payload.acquisitions.total,
  totalApproved: payload.kpis.total_approved_usd,
  median: payload.kpis.median_loan_usd,
  fyRange: payload.kpis.fy_range,
  maxDate,
  asOf,
  orlando: orlando.length,
  months: payload.monthly_trend.length,
  hasOctober2025: payload.monthly_trend.some((month) => month.ym === '2025-10'),
  sub1m: payload.sub1m_acq.count,
}, null, 2));
