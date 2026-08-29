import { describe, expect, it } from 'vitest';
import { computeKpiDelta } from './kpis';

describe('computeKpiDelta', () => {
  it('computes a relative change from a positive previous value', () => {
    expect(computeKpiDelta(125, 100, true)).toEqual({ pct: 0.25, positiveIsGood: true });
    expect(computeKpiDelta(75, 100, false)).toEqual({ pct: -0.25, positiveIsGood: false });
  });

  it('does not produce a misleading percentage without a positive baseline', () => {
    expect(computeKpiDelta(100, 0, true)).toBeUndefined();
    expect(computeKpiDelta(100, null, true)).toBeUndefined();
    expect(computeKpiDelta(100, undefined, true)).toBeUndefined();
  });
});
