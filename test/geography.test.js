import assert from 'node:assert/strict';
import test from 'node:test';
import { filterLoans, geographyChoices } from '../src/geography.js';
import { loan } from './helpers.js';

const nevada = [
  loan({ borrowerCity: 'Las Vegas', projectCounty: 'CLARK', projectState: 'NV' }),
  loan({ borrowerCity: 'Henderson', projectCounty: 'Clark', projectState: 'nv', grossApproval: 200000 }),
  loan({ borrowerCity: 'Reno', projectCounty: 'WASHOE', projectState: 'NV', grossApproval: 300000 }),
  loan({ borrowerCity: 'Vancouver', projectCounty: 'CLARK', projectState: 'WA', grossApproval: 400000 }),
  loan({ borrowerCity: 'Phoenix', projectCounty: 'MARICOPA', projectState: 'AZ', grossApproval: 500000 }),
];

test('county names from different states stay separate', () => {
  const choices = geographyChoices(nevada, { states: ['NV'] });
  const ids = choices.counties.map((county) => county.id);
  assert.deepEqual(ids, ['CLARK|NV', 'WASHOE|NV']);
  assert.equal(ids.includes('CLARK|WA'), false);
});

test('cities show up only after a county is selected, and only for that county', () => {
  const statesOnly = geographyChoices(nevada, { states: ['nv'] });
  assert.equal(statesOnly.cities.length, 0);

  const clark = geographyChoices(nevada, { states: ['NV'], counties: ['CLARK|NV'] });
  assert.deepEqual(clark.cities.map((city) => city.label), ['Henderson', 'Las Vegas']);
  assert.equal(clark.cities.some((city) => city.label === 'Vancouver'), false);
});

test('no state selected does not list every county in the file', () => {
  const choices = geographyChoices(nevada, {});
  assert.equal(choices.counties.length, 0);
  assert.equal(choices.cities.length, 0);
  assert.equal(choices.states.length, 3);
});

test('empty steps mean everything inside the parent selection', () => {
  assert.equal(filterLoans(nevada, {}).length, 5);
  assert.equal(filterLoans(nevada, { states: ['NV'] }).length, 3);
  assert.equal(filterLoans(nevada, { states: ['NV'], counties: ['CLARK|NV'] }).length, 2);
});

test('two cities are combined and each loan is counted once', () => {
  const lasVegas = 'LAS VEGAS|CLARK|NV';
  const henderson = 'HENDERSON|CLARK|NV';
  const selected = filterLoans(nevada, {
    states: ['NV'],
    counties: ['Clark County|NV'],
    cities: [lasVegas, henderson],
  });
  assert.equal(selected.length, 2);
  assert.equal(new Set(selected.map((row) => row.borrowerCity)).size, 2);
});

test('a county outside the selected state does not widen the result', () => {
  const selected = filterLoans(nevada, { states: ['NV'], counties: ['CLARK|WA'] });
  assert.equal(selected.length, 0);
});

test('a trailing comma does not create a second city', () => {
  const choices = geographyChoices([
    loan({ borrowerCity: 'Henderson' }),
    loan({ borrowerCity: 'Henderson,' }),
  ], { states: ['NV'], counties: ['CLARK|NV'] });
  assert.deepEqual(choices.cities.map((city) => city.label), ['Henderson']);
});

test('two states can be selected together', () => {
  const choices = geographyChoices(nevada, { states: ['NV', 'AZ'] });
  assert.deepEqual(choices.counties.map((county) => county.id), ['CLARK|NV', 'MARICOPA|AZ', 'WASHOE|NV']);
  const selected = filterLoans(nevada, { states: ['NV', 'AZ'], counties: ['CLARK|NV', 'MARICOPA|AZ'] });
  assert.equal(selected.length, 3);
});
