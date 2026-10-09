import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { escapeHtml, hasOfficialIndustryName, industryCell, industryName } from '../src/naics.js';
import { readPublishedPayload } from '../src/published.js';

test('three-digit industries use the official name, not the most common six-digit title', () => {
  assert.equal(industryName('811', 'General Automotive Repair'), 'Repair and Maintenance');
  assert.equal(industryName('561', 'Landscaping Services'), 'Administrative and Support Services');
  assert.equal(industryName('238', 'Plumbing, Heating, and Air-Conditioning Contractors'), 'Specialty Trade Contractors');
  assert.equal(industryName('621', 'Home Health Care Services'), 'Ambulatory Health Care Services');
  assert.equal(industryName('812', 'Drycleaning and Laundry Services (except Coin-Operated)'), 'Personal and Laundry Services');
  assert.equal(industryName('442', 'Furniture Stores'), 'Furniture and Home Furnishings Stores');
  assert.equal(industryName('721', 'Hotels (except Casino Hotels) and Motels'), 'Accommodation');
});

test('every industry currently on the dashboard has an official three-digit name', () => {
  const payload = readPublishedPayload();
  const codes = new Set([
    ...payload.naics3.map((row) => row.code),
    ...payload.acq_industries.map((row) => row.code),
  ]);
  codes.forEach((code) => {
    assert.equal(hasOfficialIndustryName(code), true, code);
    assert.equal(industryName(code).length > 0, true);
  });
});

test('an unknown code falls back to the source text', () => {
  assert.equal(industryName('999', 'Some Other Work'), 'Some Other Work');
  assert.equal(industryName('999'), '999');
});

test('the industry cell is HTML-safe and keeps the code beside the name', () => {
  const html = industryCell('811', 'General Automotive Repair <span style="color:#888">811</span>');
  assert.match(html, /^Repair and Maintenance <span/);
  assert.match(html, />811<\/span>$/);
  assert.equal(html.includes('General Automotive'), false);
  assert.equal(html.includes('<span style="color:#888">811</span>'), false);
  assert.equal(escapeHtml('<span>'), '&lt;span&gt;');
});

test('the best-fit table renders that cell as HTML instead of plain text', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /import \{ industryCell, industryName \} from '\.\/src\/naics\.js'/);
  assert.match(page, /gridjs\.html\(industryCell\(/);
  assert.match(page, /industryName\(s\.code, s\.desc\)/);
  assert.match(page, /industryName\(x\.code, x\.desc\)/);
});
