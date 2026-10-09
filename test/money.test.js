import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { formatMoney } from '../src/money.js';
import { readPublishedPayload } from '../src/published.js';

test('amounts of at least one billion render as billions with two decimals', () => {
  assert.equal(formatMoney(1_137_260_000), '$1.14B');
  assert.equal(formatMoney(1_000_000_000), '$1.00B');
  assert.equal(formatMoney(999_999_999), '$1000.00M');
  assert.equal(formatMoney(1_500_000), '$1.50M');
  assert.equal(formatMoney(729_000), '$729K');
  assert.equal(formatMoney(500), '$500');

  const approved = readPublishedPayload().kpis.total_approved_usd;
  assert.equal(approved, 1137263700);
  assert.equal(formatMoney(approved), '$1.14B');
});

test('the headline approved total uses the shared money formatter', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /import \{ formatMoney \} from '\.\/src\/money\.js'/);
  assert.match(page, /const fmt\$ = formatMoney/);
  assert.match(page, /label: 'Approved', value: fmt\$\(k\.total_approved_usd\)/);
});
