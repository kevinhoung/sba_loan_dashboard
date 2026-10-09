import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the page wires a cascading state, county, and city picker', () => {
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /id="stateSearch"/);
  assert.match(page, /id="countySearch"/);
  assert.match(page, /id="citySearch"/);
  assert.match(page, /import \{ geographyChoices \} from '\.\/src\/geography\.js'/);
  assert.match(page, /import \{ unpackStateFile \} from '\.\/src\/loan-pack\.js'/);
  assert.match(page, /import \{ DEFAULT_SELECTION, retainSelection, selectionLabel, toggleSelection \} from '\.\/src\/selection\.js'/);
  assert.match(page, /summarize\(loadedLoans, selection\)/);
  assert.match(page, /fetch\(`data\/loans\/\$\{entry\.file\}`\)/);
  assert.match(page, /fetch\('data\/loans\/index\.json'\)/);
  assert.match(page, /Select at least one state/);
});
