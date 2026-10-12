const SIZE_CHART_LABELS = {
  '<$50K': '<$50K',
  '$50K-$150K': '$50–150K',
  '$150K-$350K': '$150–350K',
  '$350K-$500K': '$350–500K',
  '$500K-$1M': '$500K–$1M',
  '$1M-$2M': '$1–2M',
  '$2M+': '$2M+',
};

export function formatRate(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number}%`;
}

// Charge-off columns use two decimals so 3.5% and 3.84% share a decimal point.
export function formatChargeOff(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number.toFixed(2)}%`;
}

export function sizeChartLabel(bucket) {
  return SIZE_CHART_LABELS[bucket] || String(bucket ?? '');
}
