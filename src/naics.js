// Official 3-digit titles. Codes that exist in NAICS 2022 use that title.
// Codes retired after 2017 keep the 2017 title.
const NAICS3 = {
  236: 'Construction of Buildings',
  238: 'Specialty Trade Contractors',
  339: 'Miscellaneous Manufacturing',
  423: 'Merchant Wholesalers, Durable Goods',
  424: 'Merchant Wholesalers, Nondurable Goods',
  441: 'Motor Vehicle and Parts Dealers',
  445: 'Food and Beverage Retailers',
  446: 'Health and Personal Care Stores',
  448: 'Clothing and Clothing Accessories Stores',
  453: 'Miscellaneous Store Retailers',
  454: 'Nonstore Retailers',
  456: 'Health and Personal Care Retailers',
  459: 'Sporting Goods, Hobby, Musical Instrument, Book, and Miscellaneous Retailers',
  484: 'Truck Transportation',
  524: 'Insurance Carriers and Related Activities',
  531: 'Real Estate',
  532: 'Rental and Leasing Services',
  541: 'Professional, Scientific, and Technical Services',
  561: 'Administrative and Support Services',
  562: 'Waste Management and Remediation Services',
  611: 'Educational Services',
  621: 'Ambulatory Health Care Services',
  623: 'Nursing and Residential Care Facilities',
  624: 'Social Assistance',
  711: 'Performing Arts, Spectator Sports, and Related Industries',
  713: 'Amusement, Gambling, and Recreation Industries',
  811: 'Repair and Maintenance',
  812: 'Personal and Laundry Services',
};

export function naics3Code(code) {
  return String(code ?? '').replace(/\D/g, '').slice(0, 3);
}

export function industryName(code, fallback = '') {
  const digits = naics3Code(code);
  if (NAICS3[digits]) return NAICS3[digits];
  const text = String(fallback ?? '').trim();
  return text || digits;
}

export function hasOfficialIndustryName(code) {
  return Boolean(NAICS3[naics3Code(code)]);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function industryCell(code, fallback = '') {
  const name = industryName(code, fallback);
  return `${escapeHtml(name)} <span style="color:#888;font-size:11px;">${escapeHtml(naics3Code(code))}</span>`;
}
