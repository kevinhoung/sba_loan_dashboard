import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { DEFAULT_SELECTION, clearSelection, retainSelection, selectionLabel, statesToLoad, toggleSelection } from '../src/selection.js';
import { geographyChoices } from '../src/geography.js';
import { loan } from './helpers.js';

const loans = [
  loan({ borrowerCity: 'Las Vegas', projectCounty: 'CLARK', projectState: 'NV' }),
  loan({ borrowerCity: 'Henderson', projectCounty: 'CLARK', projectState: 'NV' }),
  loan({ borrowerCity: 'Reno', projectCounty: 'WASHOE', projectState: 'NV' }),
  loan({ borrowerCity: 'Phoenix', projectCounty: 'MARICOPA', projectState: 'AZ' }),
];

test('choosing a second city keeps the first city', () => {
  const clark = toggleSelection({ states: ['NV'], counties: [], cities: [] }, 'counties', 'CLARK|NV', loans);
  const both = toggleSelection(clark, 'cities', 'LAS VEGAS|CLARK|NV', loans);
  const withHenderson = toggleSelection(both, 'cities', 'HENDERSON|CLARK|NV', loans);
  assert.deepEqual(withHenderson.cities.sort(), ['HENDERSON|CLARK|NV', 'LAS VEGAS|CLARK|NV']);
});

test('removing a state drops counties and cities that were inside it', () => {
  const selected = {
    states: ['NV', 'AZ'],
    counties: ['CLARK|NV', 'MARICOPA|AZ'],
    cities: ['LAS VEGAS|CLARK|NV', 'PHOENIX|MARICOPA|AZ'],
  };
  const onlyNevada = toggleSelection(selected, 'states', 'AZ', loans);
  assert.deepEqual(onlyNevada.states, ['NV']);
  assert.deepEqual(onlyNevada.counties, ['CLARK|NV']);
  assert.deepEqual(onlyNevada.cities, ['LAS VEGAS|CLARK|NV']);
});

test('keeping a selection drops places that are outside the loaded loans', () => {
  const kept = retainSelection({
    states: ['NV'],
    counties: ['CLARK|NV', 'MARICOPA|AZ'],
    cities: ['LAS VEGAS|CLARK|NV', 'PHOENIX|MARICOPA|AZ'],
  }, loans);
  assert.deepEqual(kept.states, ['NV']);
  assert.deepEqual(kept.counties, ['CLARK|NV']);
  assert.deepEqual(kept.cities, ['LAS VEGAS|CLARK|NV']);
});

test('the summary says all counties when no county is picked', () => {
  const choices = geographyChoices(loans, { states: ['NV'] });
  const label = selectionLabel({ states: ['NV'], counties: [], cities: [] }, { ...choices, states: choices.states });
  assert.match(label, /Nevada/);
  assert.match(label, /all counties/);
});

test('the default selection is the whole country', () => {
  assert.deepEqual(DEFAULT_SELECTION, { states: [], counties: [], cities: [] });
  const catalog = JSON.parse(readFileSync(new URL('../data/loans/index.json', import.meta.url), 'utf8'));
  const files = readdirSync(new URL('../data/loans/', import.meta.url)).filter((name) => name.endsWith('.json') && name !== 'index.json');
  const loaded = statesToLoad(DEFAULT_SELECTION, catalog);
  assert.deepEqual(loaded.slice().sort(), catalog.map((row) => row.id).sort());
  assert.equal(loaded.length, files.length);
  for (const file of files) {
    assert.equal(catalog.some((row) => row.file === file && loaded.includes(row.id)), true);
  }
  assert.deepEqual(statesToLoad({ states: ['NV'], counties: ['CLARK|NV'], cities: [] }, catalog), ['NV']);
});

test('the United States control clears a state, county, and city', () => {
  const cleared = clearSelection({
    states: ['NV'],
    counties: ['CLARK|NV'],
    cities: ['LAS VEGAS|CLARK|NV'],
  });
  assert.deepEqual(cleared, { states: [], counties: [], cities: [] });
  assert.equal(selectionLabel(cleared, { states: [], counties: [], cities: [] }), 'United States · all states');
});
