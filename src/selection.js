import { geographyChoices } from './geography.js';

export const DEFAULT_SELECTION = {
  states: ['NV'],
  counties: ['CLARK|NV'],
  cities: [],
};

function copy(selection) {
  return {
    states: [...(selection.states || [])],
    counties: [...(selection.counties || [])],
    cities: [...(selection.cities || [])],
  };
}

function prune(selection, loans) {
  const countyChoices = geographyChoices(loans, { states: selection.states });
  const countyIds = new Set(countyChoices.counties.map((county) => county.id));
  selection.counties = selection.counties.filter((id) => countyIds.has(id));
  const cityChoices = geographyChoices(loans, selection);
  const cityIds = new Set(cityChoices.cities.map((city) => city.id));
  selection.cities = selection.cities.filter((id) => cityIds.has(id));
  return selection;
}

export function toggleSelection(selection, level, id, loans) {
  const next = copy(selection);
  const list = next[level];
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.push(id);
  return prune(next, loans);
}

export function retainSelection(selection, loans) {
  return prune(copy(selection), loans);
}

export function selectionLabel(selection, choices) {
  const stateNames = selection.states.map((id) => choices.states.find((state) => state.id === id)?.label || id);
  const countyNames = selection.counties.map((id) => choices.counties.find((county) => county.id === id)?.label || id);
  const cityNames = selection.cities.map((id) => choices.cities.find((city) => city.id === id)?.label || id);
  const stateText = stateNames.length ? stateNames.join(', ') : 'No state selected';
  const countyText = selection.states.length ? (countyNames.length ? countyNames.join(', ') : 'all counties') : '';
  const cityText = selection.counties.length ? (cityNames.length ? cityNames.join(', ') : 'all cities') : '';
  return [stateText, countyText, cityText].filter(Boolean).join(' · ');
}
