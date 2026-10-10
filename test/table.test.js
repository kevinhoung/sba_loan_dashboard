import assert from 'node:assert/strict';
import test from 'node:test';
import { pageButtons, searchText, tableView } from '../src/table.js';

const columns = [
  { name: 'Lender', index: 0 },
  { name: 'Loans', index: 1, numeric: true },
  { name: 'Rate', index: 2, numeric: true },
];

const rows = [
  ['Wells Fargo', 10, 8.5],
  ['Huntington', 30, null],
  ['Live Oak', 20, 7],
  ['TD Bank', 5, 10.2],
];

test('pages keep the first rows and a later page', () => {
  const first = tableView(rows, columns, { page: 0, pageSize: 2 });
  assert.equal(first.total, 4);
  assert.equal(first.pages, 2);
  assert.deepEqual(first.rows.map((row) => row[0]), ['Wells Fargo', 'Huntington']);
  const second = tableView(rows, columns, { page: 1, pageSize: 2 });
  assert.deepEqual(second.rows.map((row) => row[0]), ['Live Oak', 'TD Bank']);
});

test('a page past the end clamps back to the last page', () => {
  const view = tableView(rows, columns, { page: 9, pageSize: 3 });
  assert.equal(view.page, 1);
  assert.equal(view.rows.length, 1);
});

test('search matches a lender without throwing on a blank rate', () => {
  const view = tableView(rows, columns, { query: 'oak', pageSize: 10 });
  assert.deepEqual(view.rows.map((row) => row[0]), ['Live Oak']);
  assert.equal(searchText(columns[2], rows[1]), '');
  assert.doesNotThrow(() => tableView([['Only', null, null]], columns, { query: 'only', pageSize: 10 }));
});

test('numeric sort puts blanks last in both directions', () => {
  const asc = tableView(rows, columns, { sortIndex: 1, sortDir: 1, pageSize: 10 });
  assert.deepEqual(asc.rows.map((row) => row[1]), [5, 10, 20, 30]);
  const desc = tableView(rows, columns, { sortIndex: 2, sortDir: -1, pageSize: 10 });
  assert.deepEqual(desc.rows.map((row) => row[2]), [10.2, 8.5, 7, null]);
});

test('page buttons match the first, middle, and last windows', () => {
  assert.deepEqual(pageButtons(0, 209).map((item) => item.type === 'spread' ? '...' : item.page + 1), [1, 2, 3, '...', 209]);
  assert.deepEqual(pageButtons(5, 209).map((item) => item.type === 'spread' ? '...' : item.page + 1), [1, '...', 5, 6, 7, '...', 209]);
  assert.deepEqual(pageButtons(208, 209).map((item) => item.type === 'spread' ? '...' : item.page + 1), [1, '...', 207, 208, 209]);
  assert.deepEqual(pageButtons(0, 1).map((item) => item.page + 1), [1]);
});
