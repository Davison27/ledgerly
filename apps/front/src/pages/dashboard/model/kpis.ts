export interface KpiDelta {
  pct: number;
  positiveIsGood: boolean;
}

export function computeKpiDelta(
  current: number,
  previous: number | null | undefined,
  positiveIsGood: boolean,
): KpiDelta | undefined {
  if (!previous || previous <= 0) return undefined;
  return { pct: (current - previous) / previous, positiveIsGood };
}
