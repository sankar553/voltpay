export type UsageStats = {
  average: number;
  max: number;
  maxIndex: number;
  latest: number;
  previous: number | null;
  /** Latest vs previous month, in % with one decimal; null when there is nothing to compare. */
  trendPercent: number | null;
};

export function usageStats(units: number[]): UsageStats {
  if (units.length === 0) {
    return { average: 0, max: 0, maxIndex: -1, latest: 0, previous: null, trendPercent: null };
  }
  const latest = units[units.length - 1];
  const previous = units.length > 1 ? units[units.length - 2] : null;
  const max = Math.max(...units);
  return {
    average: Math.round(units.reduce((a, b) => a + b, 0) / units.length),
    max,
    maxIndex: units.indexOf(max),
    latest,
    previous,
    trendPercent: previous ? Math.round(((latest - previous) / previous) * 1000) / 10 : null,
  };
}
