import { summarizeFinancials } from './project-financials';

describe('summarizeFinancials', () => {
  it('groups currencies, calculates profit and margin, and sorts by currency', () => {
    const result = summarizeFinancials(
      [
        { projectId: 'project-1', currency: 'USD', income: 80, expenses: 20 },
        { projectId: 'project-1', currency: 'EUR', income: 120, expenses: 40 },
        { projectId: 'project-1', currency: 'USD', income: 20, expenses: 5 },
      ],
      'EUR',
    );

    expect(result).toEqual([
      { currency: 'EUR', income: 120, expenses: 40, profit: 80, margin: 2 / 3 },
      { currency: 'USD', income: 100, expenses: 25, profit: 75, margin: 0.75 },
    ]);
  });

  it('adds the project currency with zero values when it has no movements', () => {
    expect(summarizeFinancials([], 'GBP')).toEqual([
      { currency: 'GBP', income: 0, expenses: 0, profit: 0, margin: null },
    ]);
  });

  it('returns a null margin when income is zero', () => {
    expect(
      summarizeFinancials(
        [{ projectId: 'project-1', currency: 'EUR', income: 0, expenses: 50 }],
        'EUR',
      ),
    ).toEqual([
      { currency: 'EUR', income: 0, expenses: 50, profit: -50, margin: null },
    ]);
  });
});
