export function loan(overrides = {}) {
  return {
    program: '7A',
    borrowerCity: 'Las Vegas',
    borrowerState: 'NV',
    bankName: 'Example Bank',
    grossApproval: 100000,
    approvalDate: '2022-06-15',
    approvalFy: 2022,
    interestRate: 8,
    termMonths: 120,
    naics: '811111',
    naicsDescription: 'General Automotive Repair',
    projectCounty: 'CLARK',
    projectState: 'NV',
    businessAge: 'Existing or more than 2 years old',
    status: 'EXEMPT',
    grossChargeOff: 0,
    jobs: 2,
    ...overrides,
  };
}
