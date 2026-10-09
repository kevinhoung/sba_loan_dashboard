const STATUS_LABELS = {
  PIF: 'Paid In Full',
  CHGOFF: 'Charged Off',
  EXEMPT: 'Current',
  COMMIT: 'Undisbursed',
  CANCLD: 'Cancelled',
  CLOSED: 'Closed',
  NOTFUNDED: 'Undisbursed',
};

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

export function rowsToRecords(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
}

export function normalizeStatus(status) {
  const compact = String(status ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (compact === 'PAIDINFULL') return 'PIF';
  if (compact === 'CANCELLED' || compact === 'CANCELED') return 'CANCLD';
  if (compact === 'CHARGEDOFF') return 'CHGOFF';
  if (compact === 'NOTFUNDED') return 'COMMIT';
  return compact;
}

export function statusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] || normalizeStatus(status);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

export function naicsDigits(code) {
  return String(code ?? '').replace(/\D/g, '');
}

export function normalizeRow(row) {
  const program = String(row.Program ?? row.program ?? '').replace(/\s/g, '').toUpperCase();
  const grossApproval = numberOrNull(row.GrossApproval ?? row.grossApproval);
  const termMonths = numberOrNull(row.TermInMonths ?? row.termMonths);
  const jobs = numberOrNull(row.JobsSupported ?? row.jobs);
  return {
    program,
    borrowerCity: String(row.BorrCity ?? row.borrowerCity ?? '').trim(),
    borrowerState: String(row.BorrState ?? row.borrowerState ?? '').trim(),
    bankName: String(row.BankName ?? row.bankName ?? '').trim(),
    grossApproval,
    approvalDate: String(row.ApprovalDate ?? row.approvalDate ?? '').slice(0, 10),
    approvalFy: numberOrNull(row.ApprovalFY ?? row.approvalFy),
    interestRate: numberOrNull(row.InitialInterestRate ?? row.interestRate),
    termMonths: termMonths === null ? null : Math.round(termMonths),
    naics: naicsDigits(row.NaicsCode ?? row.naics),
    naicsDescription: String(row.NaicsDescription ?? row.naicsDescription ?? '').trim(),
    projectCounty: String(row.ProjectCounty ?? row.projectCounty ?? '').trim(),
    projectState: String(row.ProjectState ?? row.projectState ?? '').trim(),
    businessAge: String(row.BusinessAge ?? row.businessAge ?? '').trim(),
    status: normalizeStatus(row.LoanStatus ?? row.status),
    grossChargeOff: numberOrNull(row.GrossChargeOffAmount ?? row.grossChargeOff) ?? 0,
    jobs: jobs === null ? 0 : Math.round(jobs),
  };
}

export function isRestaurant(loan) {
  return naicsDigits(loan.naics).startsWith('722');
}

export function isCancelled(loan) {
  return normalizeStatus(loan.status) === 'CANCLD';
}

export function isChargeOff(loan) {
  return normalizeStatus(loan.status) === 'CHGOFF';
}

export function isPaidInFull(loan) {
  return normalizeStatus(loan.status) === 'PIF';
}

// FOIA has no delinquency flag. Distress is a charged-off loan, an undisbursed
// commitment, a legacy closed loan, or any loan with a charge-off amount.
export function isDistressed(loan) {
  const status = normalizeStatus(loan.status);
  return status === 'CHGOFF' || status === 'COMMIT' || status === 'CLOSED' || (Number(loan.grossChargeOff) > 0);
}

export function businessAgeGroup(loan) {
  const age = String(loan.businessAge ?? '').toLowerCase();
  if (age.includes('change of ownership')) return 'acquisition';
  if (age.includes('startup')) return 'startup';
  if (age.includes('existing') || age.includes('more than 2')) return 'existing';
  if (age.includes('new business') || age.includes('2 years or less')) return 'new';
  return 'other';
}

export function eligibleLoans(loans) {
  return loans.filter((loan) => loan.program === '7A' && !isRestaurant(loan) && !isCancelled(loan));
}
