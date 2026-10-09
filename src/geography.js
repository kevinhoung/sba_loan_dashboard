const COUNTY_SUFFIX = / (CITY AND BOROUGH|CENSUS AREA|MUNICIPALITY|COUNTY|PARISH|BOROUGH)$/;

export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands', AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
};

export function normalizeText(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
}

export function normalizeState(value) {
  return normalizeText(value);
}

export function countyName(value) {
  return normalizeText(value).replace(COUNTY_SUFFIX, '');
}

export function countyKey(county, state) {
  return `${countyName(county)}|${normalizeState(state)}`;
}

export function cityKey(city, county, state) {
  return `${normalizeText(city)}|${countyKey(county, state)}`;
}

export function loanCountyKey(loan) {
  return countyKey(loan.projectCounty, loan.projectState);
}

export function loanCityKey(loan) {
  return cityKey(loan.borrowerCity, loan.projectCounty, loan.projectState);
}

export function borrowerCityLabel(loan) {
  const city = titleCase(loan.borrowerCity);
  const borrowerState = normalizeState(loan.borrowerState);
  const projectState = normalizeState(loan.projectState);
  if (borrowerState && projectState && borrowerState !== projectState) return `${city}, ${borrowerState}`;
  return city;
}

// The loan file has a borrower city and state, and a project county. It does not
// name the borrower's county. A matching state is the evidence that the city sits
// with that project. A different state is another town, and a missing city or
// state is not enough to place it, so those rows stay out of the city table.
// The loan itself still counts in the county totals.
export function borrowerCityInCounty(loan) {
  const city = normalizeText(loan.borrowerCity);
  const borrowerState = normalizeState(loan.borrowerState);
  const projectState = normalizeState(loan.projectState);
  if (!city || !borrowerState || !projectState) return false;
  return borrowerState === projectState;
}

export function titleCase(value) {
  return normalizeText(value).toLowerCase().replace(/\b[\w']/g, (letter) => letter.toUpperCase());
}

export function stateOption(state) {
  const code = normalizeState(state);
  return { id: code, label: STATE_NAMES[code] ? `${STATE_NAMES[code]} (${code})` : code };
}

export function countyOption(county, state) {
  const key = countyKey(county, state);
  const name = countyName(county);
  const raw = normalizeText(county);
  const labelName = COUNTY_SUFFIX.test(raw) || / CITY$/.test(raw) ? titleCase(raw) : `${titleCase(name)} County`;
  return { id: key, label: `${labelName}, ${normalizeState(state)}` };
}

export function cityOption(city, county, state, borrowerState = state) {
  return {
    id: cityKey(city, county, state),
    label: borrowerCityLabel({ borrowerCity: city, borrowerState, projectState: state }),
    countyId: countyKey(county, state),
    state: normalizeState(state),
  };
}

function selected(values) {
  return (values ?? []).map((value) => String(value).trim()).filter(Boolean);
}

// An empty level means "everything inside the parent." No state means the whole file.
export function filterLoans(loans, selection = {}) {
  const states = selected(selection.states).map(normalizeState);
  const counties = selected(selection.counties).map((value) => {
    const [county, state] = String(value).split('|');
    return state ? countyKey(county, state) : countyKey(value, '');
  });
  const cities = selected(selection.cities);

  return loans.filter((loan) => {
    if (states.length && !states.includes(normalizeState(loan.projectState))) return false;
    if (counties.length && !counties.includes(loanCountyKey(loan))) return false;
    if (cities.length && !cities.includes(loanCityKey(loan))) return false;
    return true;
  });
}

function uniqueById(options) {
  const seen = new Map();
  options.forEach((option) => {
    if (option.id && !seen.has(option.id)) seen.set(option.id, option);
  });
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

// Counties appear only after a state is chosen. Cities appear only after a county is chosen.
export function geographyChoices(loans, selection = {}) {
  const states = uniqueById(loans.map((loan) => stateOption(loan.projectState)));
  const selectedStates = selected(selection.states).map(normalizeState);
  if (!selectedStates.length) return { states, counties: [], cities: [] };

  const inStates = loans.filter((loan) => selectedStates.includes(normalizeState(loan.projectState)));
  const counties = uniqueById(inStates.map((loan) => countyOption(loan.projectCounty, loan.projectState)));
  const selectedCounties = new Set(selected(selection.counties));
  if (!selectedCounties.size) return { states, counties, cities: [] };

  const inCounties = inStates.filter((loan) => selectedCounties.has(loanCountyKey(loan)));
  const cities = uniqueById(inCounties.map((loan) => cityOption(loan.borrowerCity, loan.projectCounty, loan.projectState, loan.borrowerState)));
  return { states, counties, cities };
}
