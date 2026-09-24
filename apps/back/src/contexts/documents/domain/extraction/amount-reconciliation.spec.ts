import { AmountCandidates, reconcileAmounts } from './amount-reconciliation';

function baseCandidates(overrides: Partial<AmountCandidates> = {}): AmountCandidates {
  return {
    totals: [],
    bases: [],
    vatLines: [],
    pool: [],
    ...overrides,
  };
}

describe('reconcileAmounts', () => {
  it('reconciles a single VAT rate against a labelled total', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [{ value: 1210, priority: 1 }],
        vatLines: [{ rate: 21, amount: 210, base: 1000 }],
        pool: [1000, 210, 1210],
      }),
    );

    expect(result).toEqual({
      amount: 1210,
      taxBase: 1000,
      taxAmount: 210,
      taxRate: 21,
      irpfRate: undefined,
      irpfAmount: undefined,
      rates: [21],
    });
  });

  it('prefers the higher-priority "total a pagar" over a larger "total factura"', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [
          { value: 2420, priority: 2 },
          { value: 2120, priority: 3 },
        ],
        vatLines: [{ rate: 21, amount: 420, base: 2000 }],
        irpf: { rate: 15, amount: -300 },
        pool: [2000, 420, 300, 2420, 2120],
      }),
    );

    expect(result?.amount).toBe(2120);
    expect(result?.irpfAmount).toBe(300);
  });

  it('sums base and VAT across two rates and reports both rates', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [{ value: 1760, priority: 1 }],
        vatLines: [
          { rate: 10, amount: 50, base: 500 },
          { rate: 21, amount: 210, base: 1000 },
        ],
        pool: [500, 50, 1000, 210, 1760],
      }),
    );

    expect(result?.taxBase).toBe(1500);
    expect(result?.taxAmount).toBe(260);
    expect(result?.taxRate).toBeUndefined();
    expect(result?.rates).toEqual([10, 21]);
    expect(result?.amount).toBe(1760);
  });

  it('reports a negative printed IRPF amount as a positive irpfAmount', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [{ value: 1060, priority: 1 }],
        vatLines: [{ rate: 21, amount: 210, base: 1000 }],
        irpf: { rate: 15, amount: -150 },
        pool: [1000, 210, 150, 1060],
      }),
    );

    expect(result?.irpfAmount).toBe(150);
    expect(result?.amount).toBe(1060);
  });

  it('derives IRPF from the pool when only its rate is labelled', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [],
        vatLines: [{ rate: 21 }],
        irpf: { rate: 15 },
        pool: [1000, 210, 150, 1060],
      }),
    );

    expect(result?.taxBase).toBe(1000);
    expect(result?.taxAmount).toBe(210);
    expect(result?.irpfAmount).toBe(150);
    expect(result?.amount).toBe(1060);
  });

  it('returns null when no VAT rate reconciles, such as suplidos breaking the pool search', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [{ value: 1090, priority: 1 }],
        vatLines: [{ rate: 21 }],
        pool: [1000, 30, 1090],
      }),
    );

    expect(result).toBeNull();
  });

  it('accepts a pool value equal to the computed payable amount when no total is labelled', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [],
        vatLines: [{ rate: 21, amount: 105, base: 500 }],
        pool: [500, 105, 605],
      }),
    );

    expect(result?.amount).toBe(605);
  });

  it('returns an undefined amount when a labelled total exists but nothing reconciles to it', () => {
    const result = reconcileAmounts(
      baseCandidates({
        totals: [{ value: 999, priority: 1 }],
        vatLines: [{ rate: 21, amount: 210, base: 1000 }],
        pool: [1000, 210, 999],
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.amount).toBeUndefined();
    expect(result?.taxBase).toBe(1000);
    expect(result?.taxAmount).toBe(210);
  });
});
