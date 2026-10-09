// Quiet sector marks for industry and sector rows.
// One drawing per NAICS sector (2-digit). Names are the labels this
// dashboard already prints; a code, or "NAICS 72", maps the same way.

const SVG_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">';

function svg(body) {
  return `${SVG_OPEN}${body}</svg>`;
}

export const SECTOR_ICONS = {
  11: svg('<path d="M12 21V11"/><path d="M12 15c-4-.8-6-3.2-6-6 3.5.5 6 2.6 6 6z"/><path d="M12 12c4-.8 6-3.2 6-6-3.5.5-6 2.6-6 6z"/>'),
  21: svg('<path d="M3 20 8.5 8 12 14l3-5L21 20z"/>'),
  22: svg('<path d="M13 3 6 13h6l-1 8 8-12h-6l1-6z"/>'),
  23: svg('<path d="M4 14a8 8 0 0 1 16 0"/><path d="M2 14h20"/><path d="M5 14v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/>'),
  31: svg('<path d="M2 21V11l5 3V11l5 3V8h2V4h3v4h5v13"/><path d="M2 21h20"/><path d="M16.5 4V2"/>'),
  32: svg('<path d="M9 3h6"/><path d="M10 3v5L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19L14 8V3"/><path d="M8 14h8"/>'),
  33: svg('<path d="M8 3.5h8l3 5.2v6.6l-3 5.2H8l-3-5.2V8.7z"/><circle cx="12" cy="12" r="2.3"/>'),
  42: svg('<path d="M3 8 12 3l9 5v9l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/>'),
  44: svg('<path d="M4 10h16v10H4z"/><path d="M3 10l2-6h14l2 6"/><path d="M9 20v-5h6v5"/>'),
  45: svg('<path d="M6 8h12l-1 13H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  48: svg('<path d="M3 16V7h10v9"/><path d="M13 10h5l3 5h-8"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/><path d="M8.6 17.5h6.8"/>'),
  49: svg('<path d="M3 10 12 4l9 6v11H3z"/><path d="M9 21v-6h6v6"/>'),
  51: svg('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8"/><path d="M12 16v4"/>'),
  52: svg('<path d="M4 20V11"/><path d="M12 20V4"/><path d="M20 20V8"/><path d="M3 20h18"/>'),
  53: svg('<path d="M4 11 12 4l8 7"/><path d="M6 10.5V20h12V10.5"/><path d="M10 20v-5h4v5"/>'),
  54: svg('<rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 12h18"/>'),
  55: svg('<rect x="8" y="3" width="8" height="5" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M12 8v4M5.5 16v-4h13v4"/>'),
  56: svg('<rect x="6" y="4" width="12" height="17" rx="1.5"/><path d="M9 4h6v3H9z"/><path d="M9 11h6M9 15h4"/>'),
  61: svg('<path d="M2 10 12 5l10 5-10 5z"/><path d="M6 12v4c2 1.4 10 1.4 12 0v-4"/><path d="M22 10v6"/>'),
  62: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>'),
  71: svg('<circle cx="7" cy="17" r="2.2"/><path d="M9.2 17V6.5l9-2V14"/><circle cx="16" cy="14" r="2.2"/>'),
  72: svg('<path d="M4 19V6"/><path d="M4 14h16v5"/><path d="M20 19V11"/><path d="M4 19h16"/><circle cx="8" cy="11" r="1.6"/>'),
  81: svg('<path d="M15 6a3.5 3.5 0 0 0-4.6 4.5L5 16l3 3 5.5-5.4A3.5 3.5 0 0 0 18 9.2L15.2 12 12 8.8z"/>'),
  92: svg('<path d="M4 20h16"/><path d="M6 20V11M12 20V11M18 20V11"/><path d="M4 11h16"/><path d="M3 11 12 5l9 6"/>'),
};

const FALLBACK_ICON = svg('<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>');

const SECTOR_NAMES = {
  11: ['Agriculture', 'Agriculture, Forestry, Fishing', 'Agriculture, Forestry, Fishing and Hunting'],
  21: ['Mining', 'Mining and Oil & Gas', 'Mining, Quarrying, and Oil and Gas Extraction'],
  22: ['Utilities'],
  23: ['Construction'],
  31: ['Manufacturing (Food/Textile)'],
  32: ['Manufacturing (Wood/Chem/Plastic)'],
  33: ['Manufacturing (Metal/Machine/Equip)'],
  42: ['Wholesale Trade'],
  44: ['Retail (Auto/Furn/Home)'],
  45: ['Retail (General/Misc)'],
  48: ['Transportation'],
  49: ['Warehousing & Postal', 'Warehousing'],
  51: ['Information'],
  52: ['Finance & Insurance', 'Finance and Insurance'],
  53: ['Real Estate & Rental', 'Real Estate'],
  54: ['Professional/Scientific/Technical', 'Professional, Scientific, and Technical Services'],
  55: ['Management of Companies'],
  56: ['Admin/Support/Waste'],
  61: ['Educational Services'],
  62: ['Health Care & Social Assistance'],
  71: ['Arts, Entertainment, Recreation'],
  72: ['Accommodation', 'Accommodation and Food Services'],
  81: ['Other Services (Repair/Personal)', 'Other Services'],
  92: ['Public Administration'],
};

const NAME_TO_CODE = new Map();
for (const [code, names] of Object.entries(SECTOR_NAMES)) {
  for (const name of names) NAME_TO_CODE.set(name.toLowerCase(), code);
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function sectorCode(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const labeled = text.match(/^naics\s+(\d{2})\b/i);
  if (labeled) return SECTOR_ICONS[labeled[1]] ? labeled[1] : '';
  const compact = text.replace(/\s+/g, '');
  if (/^\d{2,6}$/.test(compact)) {
    const two = compact.slice(0, 2);
    return SECTOR_ICONS[two] ? two : '';
  }
  return NAME_TO_CODE.get(text.toLowerCase()) || '';
}

export function sectorIcon(value) {
  const code = sectorCode(value);
  const graphic = code ? SECTOR_ICONS[code] : FALLBACK_ICON;
  return `<span class="industry-mark" data-sector="${code || 'unknown'}" aria-hidden="true">${graphic}</span>`;
}

export function industryMark(name, hint = name) {
  return `<span class="industry-name">${sectorIcon(hint)}<span>${escapeHtml(name)}</span></span>`;
}

// html is already escaped by the caller (industryCell). The hint is never interpolated.
export function industryHtml(html, hint) {
  return `<span class="industry-name">${sectorIcon(hint)}<span>${html}</span></span>`;
}
