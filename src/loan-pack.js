export function unpackLoan(row, banks, descriptions) {
  return {
    program: '7A',
    borrowerCity: row[0],
    borrowerState: row[1],
    bankName: banks[row[2]] || '',
    grossApproval: row[3],
    approvalDate: row[4],
    approvalFy: row[5],
    interestRate: row[6],
    termMonths: row[7],
    naics: row[8],
    naicsDescription: descriptions[row[9]] || '',
    projectCounty: row[10],
    projectState: row[11],
    businessAge: row[12],
    status: row[13],
    grossChargeOff: row[14],
    jobs: row[15],
  };
}

export function unpackStateFile(file) {
  return file.loans.map((row) => unpackLoan(row, file.banks, file.descriptions));
}
