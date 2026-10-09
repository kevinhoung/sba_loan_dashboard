import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SECTOR_ICONS,
  industryHtml,
  industryMark,
  sectorCode,
} from '../src/industry-icon.js';
import { readPublishedPayload } from '../src/published.js';
import { sectorName } from '../src/summarize.js';

function graphic(html) {
  const match = html.match(/<svg[\s\S]*?<\/svg>/);
  assert.ok(match, html);
  return match[0];
}

test('each known sector has a distinct icon and an unknown sector uses the neutral mark', () => {
  const icons = Object.keys(SECTOR_ICONS).map((code) => graphic(industryMark('Example', code)));
  assert.equal(new Set(icons).size, icons.length);
  const unknown = industryMark('Mystery trade', '999');
  assert.match(unknown, /data-sector="unknown"/);
  assert.equal(icons.includes(graphic(unknown)), false);
  assert.match(unknown, /Mystery trade/);
});

test('a sector is chosen from the NAICS code or the dashboard sector name', () => {
  for (const code of ['11', '21', '22', '23', '31', '32', '33', '42', '44', '45', '48', '49', '51', '52', '53', '54', '55', '56', '61', '62', '71', '72', '81', '92']) {
    assert.equal(sectorCode(sectorName(`${code}0000`)), code, sectorName(code));
    assert.notEqual(graphic(industryMark('A', code)), graphic(industryMark('A', code === '23' ? '62' : '23')));
  }
  assert.equal(sectorCode('811111'), '81');
  assert.equal(sectorCode('721'), '72');
  assert.equal(sectorCode('NAICS 72'), '72');
  assert.equal(sectorCode('Accommodation'), '72');
  assert.equal(sectorCode('Construction'), '23');
  assert.equal(sectorCode('Health Care & Social Assistance'), '62');
  assert.equal(sectorCode(''), '');
  assert.equal(sectorCode('NAICS 99'), '');
});

test('every published industry and sector row maps to a known icon', () => {
  const payload = readPublishedPayload();
  payload.sectors.forEach((row) => {
    assert.equal(sectorCode(row.sector) !== '', true, row.sector);
  });
  payload.naics3.concat(payload.acq_industries).forEach((row) => {
    assert.equal(sectorCode(row.code) !== '', true, row.code);
  });
  payload.recent_acq.forEach((row) => {
    assert.equal(sectorCode(row.naics) !== '', true, row.naics);
  });
});

test('a name interpolated into the mark is escaped', () => {
  const html = industryMark(`Repair <img alt="x" onerror='alert(1)'> & Sons`, '811');
  assert.match(html, /data-sector="81"/);
  assert.match(html, /Repair &lt;img alt=&quot;x&quot; onerror=&#39;alert\(1\)&#39;&gt; &amp; Sons/);
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes("onerror='"), false);
  const nastyHint = industryMark('Safe', '<img src=x>');
  assert.match(nastyHint, /data-sector="unknown"/);
  assert.equal(nastyHint.includes('<img'), false);
  const trusted = industryHtml('<span class="keep">Repair</span>', '811');
  assert.match(trusted, /<span class="keep">Repair<\/span>/);
  assert.match(trusted, /data-sector="81"/);
});

test('industry and sector tables draw the mark beside the name', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /import \{ industryHtml, industryMark \} from '\.\/src\/industry-icon\.js'/);
  assert.match(page, /gridjs\.html\(industryHtml\(industryCell\(/);
  assert.match(page, /formatter: \(cell\) => gridjs\.html\(industryMark\(cell\)\)/);
  assert.match(page, /formatter: \(cell, row\) => gridjs\.html\(industryMark\(cell, row\.cells\[0\]\.data\)\)/);
  assert.match(page, /formatter: \(cell, row\) => gridjs\.html\(industryMark\(cell, row\.cells\[2\]\.data\)\)/);
  assert.match(page, /\.industry-mark \{/);
  assert.match(page, /acquisitionIndustryListHtml\(DATA\.acq_industries\)/);
});
