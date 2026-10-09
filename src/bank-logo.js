const LEGAL_SUFFIXES = [
  'NATIONAL ASSOCIATION',
  'N A',
  'INCORPORATED',
  'L L C',
  'LLC',
  'INC',
  'CORPORATION',
  'CORP',
  'COMPANY',
];

// Exact SBA lender names whose public site was checked by hand.
// Used when the FDIC name differs, the lender is a credit union, or the
// consumer brand lives on a different domain than the charter site.
export const DOMAIN_OVERRIDES = {
  'Zions Bank, A Division of': 'zionsbank.com',
  'America First Federal Credit Union': 'americafirst.com',
  'Readycap Lending, LLC': 'readycapital.com',
  'Newtek Small Business Finance, Inc.': 'newtekone.com',
  'Lendistry SBLC, LLC': 'lendistry.com',
  'Harvest Small Business Finance, LLC': 'harvestsbf.com',
  'Mountain America FCU': 'macu.com',
  'Webster Bank National Association': 'websterbank.com',
  'Northeast Bank': 'northeastbank.com',
  'Truliant FCU': 'truliantfcu.org',
  'Idaho Central CU': 'iccu.com',
  'JPMorgan Chase Bank, National Association': 'chase.com',
  'CenTrust Bank, A Division of SmartBiz Bank National Association': 'smartbizbank.com',
};

// Names that would otherwise resolve to a site whose icon is not the lender.
export const SKIP_LOGOS = [
  'CDC Small Business Finance Corp.',
  'Community Banks of Colorado, A Division of NBH Bank',
];

export function bankCore(name) {
  let text = String(name ?? '').toUpperCase().replace(/&/g, ' AND ');
  text = text.replace(/,?\s+A DIVISION OF\b.*$/, '');
  text = text.replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/^THE\s+/, '');
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      const tail = ` ${suffix}`;
      if (text.endsWith(tail)) {
        text = text.slice(0, -tail.length).trim();
        changed = true;
      }
    }
  }
  return text;
}

export function parentCore(name) {
  const match = String(name ?? '').match(/A DIVISION OF\s+(.+)$/i);
  if (!match) return '';
  return bankCore(match[1]);
}

export function domainHost(webaddr) {
  let host = String(webaddr ?? '').trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  host = host.replace(/^www\./, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return '';
  return host;
}

export function logoPath(host) {
  const safe = domainHost(host).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return safe ? `data/logos/${safe}.png` : '';
}

export function indexInstitutions(rows) {
  const byCore = new Map();
  for (const row of rows) {
    const record = row?.data || row;
    const host = domainHost(record?.WEBADDR);
    const core = bankCore(record?.NAME);
    if (!host || !core) continue;
    if (!byCore.has(core)) byCore.set(core, []);
    byCore.get(core).push(host);
  }
  return byCore;
}

export function uniqueHost(byCore, core) {
  if (!core || !byCore?.has(core)) return '';
  const hosts = [...new Set(byCore.get(core))];
  return hosts.length === 1 ? hosts[0] : '';
}

export function resolveBankDomain(name, byCore, overrides = DOMAIN_OVERRIDES, skip = SKIP_LOGOS) {
  if (skip.includes(name)) return '';
  if (overrides[name]) return domainHost(overrides[name]);
  return uniqueHost(byCore, bankCore(name)) || uniqueHost(byCore, parentCore(name));
}

export function bankInitials(name) {
  const words = bankCore(name).split(' ').filter(Boolean);
  const singles = words.filter((word) => word.length === 1);
  if (singles.length >= 2) return singles.slice(0, 2).join('');
  const significant = words.filter((word) => !['OF', 'AND', 'THE', 'FOR'].includes(word));
  const pick = (significant.length ? significant : words).slice(0, 2);
  return pick.map((word) => word[0]).join('') || '?';
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function bankMark(name, logos = {}) {
  const safeName = escapeHtml(name);
  const src = typeof logos?.[name] === 'string' && /^data\/logos\/[a-z0-9-]+\.png$/.test(logos[name])
    ? logos[name]
    : '';
  const mark = src
    ? `<img class="bank-mark" src="${escapeHtml(src)}" alt="" width="22" height="22">`
    : `<span class="bank-mark bank-initials" aria-hidden="true">${escapeHtml(bankInitials(name))}</span>`;
  return `<span class="bank-name">${mark}<span>${safeName}</span></span>`;
}
