import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRate, sizeChartLabel } from '../src/format.js';
import { SIZE_BUCKETS } from '../src/summarize.js';

test('charge-off, distress, and paid-in-full rates keep their decimals and gain a percent sign', () => {
  assert.equal(formatRate(2.33), '2.33%');
  assert.equal(formatRate(3.31), '3.31%');
  assert.equal(formatRate(33.33), '33.33%');
  assert.equal(formatRate(0), '0%');
  assert.equal(formatRate(12.5), '12.5%');
  assert.equal(formatRate(null), '—');
  assert.equal(formatRate(undefined), '—');
  assert.equal(formatRate(''), '—');
});

test('acquisition size buckets use short horizontal labels without changing the bucket', () => {
  assert.deepEqual(SIZE_BUCKETS.map(sizeChartLabel), [
    '<$50K',
    '$50–150K',
    '$150–350K',
    '$350–500K',
    '$500K–$1M',
    '$1–2M',
    '$2M+',
  ]);
  assert.equal(sizeChartLabel('$50K-$150K'), '$50–150K');
});
