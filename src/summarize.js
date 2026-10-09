import { businessAgeGroup, eligibleLoans, isChargeOff, isDistressed, isPaidInFull, statusLabel } from './normalize.js';
import { borrowerCityLabel, filterLoans, loanCityKey } from './geography.js';

export const SIZE_BUCKETS = ['<$50K', '$50K-$150K', '$150K-$350K', '$350K-$500K', '$500K-$1M', '$1M-$2M', '$2M+'];
export const MIN_SEASONED = 8;
const SEASONED_START = 2020;
const SEASONED_END = 2023;

export function median(values) {
  const sorted = values.filter((value) => value !== null && value !== undefined && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function average(values, digits = 2) {
  const usable = values.filter((value) => value !== null && value !== undefined && Number.isFinite(value));
  if (!usable.length) return null;
  const mean = usable.reduce((sum, value) => sum + value, 0) / usable.length;
  const scale = 10 ** digits;
  return Math.round(mean * scale) / scale;
}

export function monthlyPayment(principal, annualPercent, months) {
  if (!principal || !months) return null;
  const rate = annualPercent / 100 / 12;
  if (!rate) return principal / months;
  const factor = (1 + rate) ** months;
  return principal * rate * factor / (factor - 1);
}

export function percent(part, whole) {
  if (!whole) return null;
  return Math.round((part / whole) * 10000) / 100;
}

export function sizeBucket(amount) {
  if (amount < 50_000) return '<$50K';
  if (amount < 150_000) return '$50K-$150K';
  if (amount < 350_000) return '$150K-$350K';
  if (amount < 500_000) return '$350K-$500K';
  if (amount < 1_000_000) return '$500K-$1M';
  if (amount < 2_000_000) return '$1M-$2M';
  return '$2M+';
}

export function sectorName(naics) {
  const digits = String(naics ?? '');
  const two = digits.slice(0, 2);
  const names = {
    23: 'Construction',
    31: 'Manufacturing (Food/Textile)',
    32: 'Manufacturing (Wood/Chem/Plastic)',
    33: 'Manufacturing (Metal/Machine/Equip)',
    42: 'Wholesale Trade',
    44: 'Retail (Auto/Furn/Home)',
    45: 'Retail (General/Misc)',
    48: 'Transportation',
    49: 'Warehousing & Postal',
    51: 'Information',
    52: 'Finance & Insurance',
    53: 'Real Estate & Rental',
    54: 'Professional/Scientific/Technical',
    56: 'Admin/Support/Waste',
    61: 'Educational Services',
    62: 'Health Care & Social Assistance',
    71: 'Arts, Entertainment, Recreation',
    81: 'Other Services (Repair/Personal)',
  };
  return names[two] || (two ? `NAICS ${two}` : 'Unknown');
}

export function isSeasoned(loan) {
  return loan.approvalFy >= SEASONED_START && loan.approvalFy <= SEASONED_END;
}

function rates(loans) {
  const seasoned = loans.filter(isSeasoned);
  return {
    n: seasoned.length,
    chgoff_rate: percent(seasoned.filter(isChargeOff).length, seasoned.length),
    distress_rate: percent(seasoned.filter(isDistressed).length, seasoned.length),
    pif_rate: percent(seasoned.filter(isPaidInFull).length, seasoned.length),
  };
}

function modalDescription(loans) {
  const counts = new Map();
  loans.forEach((loan) => {
    const description = loan.naicsDescription || 'Unknown';
    counts.set(description, (counts.get(description) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Unknown';
}

function monthKey(date) {
  return String(date || '').slice(0, 7);
}

export function fillMonthGaps(rows) {
  if (!rows.length) return [];
  const byMonth = new Map(rows.map((row) => [row.ym, row]));
  const [startYear, startMonth] = rows[0].ym.split('-').map(Number);
  const [endYear, endMonth] = rows[rows.length - 1].ym.split('-').map(Number);
  const filled = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    filled.push(byMonth.get(ym) || { ym, n: 0, total_dollars: 0, acquisitions: 0 });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return filled;
}

function countBy(loans, keyFn) {
  const counts = {};
  loans.forEach((loan) => {
    const key = keyFn(loan);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function throughLabel(date) {
  if (!date) return '';
  const [year, month] = date.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]} ${year}`;
}

export function summarize(loans, selection = {}) {
  const scoped = filterLoans(eligibleLoans(loans), selection);
  const acquisitions = scoped.filter((loan) => businessAgeGroup(loan) === 'acquisition');
  const sub1m = acquisitions.filter((loan) => loan.grossApproval < 1_000_000);
  const dates = scoped.map((loan) => loan.approvalDate).filter(Boolean).sort();
  const fys = [...new Set(scoped.map((loan) => loan.approvalFy).filter(Boolean))].sort();

  const sectorGroups = new Map();
  const naicsGroups = new Map();
  scoped.forEach((loan) => {
    const sector = sectorName(loan.naics);
    const code = loan.naics.slice(0, 3);
    if (!sectorGroups.has(sector)) sectorGroups.set(sector, []);
    sectorGroups.get(sector).push(loan);
    if (!naicsGroups.has(code)) naicsGroups.set(code, []);
    naicsGroups.get(code).push(loan);
  });

  const sectors = [...sectorGroups.entries()].map(([sector, group]) => {
    const performance = rates(group);
    return {
      sector,
      n: performance.n,
      chgoff_rate: performance.chgoff_rate,
      distress_rate: performance.distress_rate,
      pif_rate: performance.pif_rate,
      median_loan: median(group.map((loan) => loan.grossApproval)),
      avg_term: average(group.map((loan) => loan.termMonths), 0),
    };
  }).filter((row) => row.n >= MIN_SEASONED).sort((a, b) => a.chgoff_rate - b.chgoff_rate || a.sector.localeCompare(b.sector));

  const naics3 = [...naicsGroups.entries()].map(([code, group]) => {
    const performance = rates(group);
    return {
      code,
      desc: modalDescription(group),
      sector: sectorName(code),
      n: performance.n,
      chgoff_rate: performance.chgoff_rate,
      distress_rate: performance.distress_rate,
      pif_rate: performance.pif_rate,
      median_loan: median(group.map((loan) => loan.grossApproval)),
      avg_loan: average(group.map((loan) => loan.grossApproval), 0),
      avg_term: average(group.map((loan) => loan.termMonths), 0),
    };
  }).filter((row) => row.n >= MIN_SEASONED).sort((a, b) => a.chgoff_rate - b.chgoff_rate || b.n - a.n || a.code.localeCompare(b.code));

  const chargeOffByNaics = new Map(naics3.map((row) => [row.code, row.chgoff_rate]));
  const acqGroups = new Map();
  acquisitions.forEach((loan) => {
    const code = loan.naics.slice(0, 3);
    if (!acqGroups.has(code)) acqGroups.set(code, []);
    acqGroups.get(code).push(loan);
  });

  const acqIndustries = [...acqGroups.entries()].map(([code, group]) => ({
    code,
    desc: modalDescription(group),
    sector: sectorName(code),
    n: group.length,
    median_loan: median(group.map((loan) => loan.grossApproval)),
    avg_loan: average(group.map((loan) => loan.grossApproval), 0),
    min_loan: Math.min(...group.map((loan) => loan.grossApproval)),
    max_loan: Math.max(...group.map((loan) => loan.grossApproval)),
    avg_term: average(group.map((loan) => loan.termMonths), 0),
    avg_rate: average(group.map((loan) => loan.interestRate)),
    chgoff_rate: chargeOffByNaics.get(code) ?? null,
    acq_chgoff_rate: rates(group).chgoff_rate,
  })).sort((a, b) => b.n - a.n || a.desc.localeCompare(b.desc));

  const lenderGroups = new Map();
  const acqLenderGroups = new Map();
  scoped.forEach((loan) => {
    if (!lenderGroups.has(loan.bankName)) lenderGroups.set(loan.bankName, []);
    lenderGroups.get(loan.bankName).push(loan);
  });
  acquisitions.forEach((loan) => {
    if (!acqLenderGroups.has(loan.bankName)) acqLenderGroups.set(loan.bankName, []);
    acqLenderGroups.get(loan.bankName).push(loan);
  });

  const lenderRow = (bank, group) => ({
    bank,
    n: group.length,
    total_dollars: group.reduce((sum, loan) => sum + loan.grossApproval, 0),
    median_loan: median(group.map((loan) => loan.grossApproval)),
    avg_rate: average(group.map((loan) => loan.interestRate)),
    avg_term: average(group.map((loan) => loan.termMonths), 0),
  });

  const monthly = new Map();
  scoped.forEach((loan) => {
    const ym = monthKey(loan.approvalDate);
    if (!ym) return;
    if (!monthly.has(ym)) monthly.set(ym, { ym, n: 0, total_dollars: 0, acquisitions: 0 });
    const bucket = monthly.get(ym);
    bucket.n += 1;
    bucket.total_dollars += loan.grossApproval;
    if (businessAgeGroup(loan) === 'acquisition') bucket.acquisitions += 1;
  });

  const cityGroups = new Map();
  scoped.forEach((loan) => {
    const key = loanCityKey(loan);
    if (!cityGroups.has(key)) cityGroups.set(key, []);
    cityGroups.get(key).push(loan);
  });

  const emptyBuckets = Object.fromEntries(SIZE_BUCKETS.map((bucket) => [bucket, 0]));
  const sizeDistribution = { ...emptyBuckets };
  const acqSizeDistribution = { ...emptyBuckets };
  scoped.forEach((loan) => { sizeDistribution[sizeBucket(loan.grossApproval)] += 1; });
  acquisitions.forEach((loan) => { acqSizeDistribution[sizeBucket(loan.grossApproval)] += 1; });

  return {
    kpis: {
      total_loans: scoped.length,
      total_approved_usd: scoped.reduce((sum, loan) => sum + loan.grossApproval, 0),
      median_loan_usd: median(scoped.map((loan) => loan.grossApproval)),
      avg_loan_usd: average(scoped.map((loan) => loan.grossApproval), 0),
      acquisition_loans: acquisitions.length,
      startup_loans: scoped.filter((loan) => businessAgeGroup(loan) === 'startup').length,
      existing_business_loans: scoped.filter((loan) => businessAgeGroup(loan) === 'existing').length,
      avg_interest_rate: average(scoped.map((loan) => loan.interestRate)),
      avg_term_months: average(scoped.map((loan) => loan.termMonths), 0),
      unique_lenders: lenderGroups.size,
      jobs_supported: scoped.reduce((sum, loan) => sum + (loan.jobs || 0), 0),
      fy_range: fys.length ? `${fys[0]}-${fys[fys.length - 1]} (through ${throughLabel(dates[dates.length - 1])})` : '',
      fy_count: countBy(scoped, (loan) => String(loan.approvalFy)),
    },
    sectors,
    naics3,
    acquisitions: {
      total: acquisitions.length,
      total_dollars: acquisitions.reduce((sum, loan) => sum + loan.grossApproval, 0),
      median_loan: median(acquisitions.map((loan) => loan.grossApproval)),
      avg_loan: average(acquisitions.map((loan) => loan.grossApproval), 0),
      avg_term_months: average(acquisitions.map((loan) => loan.termMonths), 0),
      avg_rate: average(acquisitions.map((loan) => loan.interestRate)),
      by_fy: countBy(acquisitions, (loan) => String(loan.approvalFy)),
      by_city: countBy(acquisitions, (loan) => borrowerCityLabel(loan)),
    },
    acq_industries: acqIndustries,
    acq_lenders: [...acqLenderGroups.entries()].map(([bank, group]) => lenderRow(bank, group)).sort((a, b) => b.n - a.n || b.total_dollars - a.total_dollars),
    all_lenders: [...lenderGroups.entries()].map(([bank, group]) => lenderRow(bank, group)).sort((a, b) => b.n - a.n || b.total_dollars - a.total_dollars),
    monthly_trend: fillMonthGaps([...monthly.values()].sort((a, b) => a.ym.localeCompare(b.ym))),
    size_distribution: sizeDistribution,
    acq_size_distribution: acqSizeDistribution,
    sub1m_acq: {
      count: sub1m.length,
      median_loan: median(sub1m.map((loan) => loan.grossApproval)),
      avg_term: average(sub1m.map((loan) => loan.termMonths), 0),
      avg_rate: average(sub1m.map((loan) => loan.interestRate)),
    },
    recent_acq: [...acquisitions].sort((a, b) => b.approvalDate.localeCompare(a.approvalDate) || b.grossApproval - a.grossApproval).slice(0, 50).map((loan) => ({
      date: loan.approvalDate,
      city: borrowerCityLabel(loan),
      naics: loan.naics,
      industry: loan.naicsDescription,
      amount: loan.grossApproval,
      term: loan.termMonths,
      rate: loan.interestRate,
      bank: loan.bankName,
      status: statusLabel(loan.status),
      jobs: loan.jobs,
    })),
    cities: [...cityGroups.entries()].map(([, group]) => ({
      city: borrowerCityLabel(group[0]),
      county: loanCityKey(group[0]),
      n: group.length,
      acquisitions: group.filter((loan) => businessAgeGroup(loan) === 'acquisition').length,
      total_dollars: group.reduce((sum, loan) => sum + loan.grossApproval, 0),
      median_loan: median(group.map((loan) => loan.grossApproval)),
    })).sort((a, b) => b.n - a.n || a.city.localeCompare(b.city)),
  };
}
