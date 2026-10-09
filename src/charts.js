export const lineHover = {
  pointRadius: 0,
  pointHoverRadius: 6,
  pointHoverBorderColor: '#e8ecf7',
  pointHoverBorderWidth: 2,
  pointHitRadius: 12,
};

export const indexHover = { mode: 'index', intersect: false };
export const barHover = { mode: 'nearest', intersect: false };

export function monthTooltipLabel(row, datasetIndex) {
  if (!row) return '';
  if (datasetIndex === 0) return ` All loans: ${row.n}`;
  return ` Acquisitions: ${row.acquisitions}`;
}
