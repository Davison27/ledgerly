export interface ProjectFinancialsRow {
  projectId: string;
  currency: string;
  income: number;
  expenses: number;
}

export interface ProjectFinancials {
  currency: string;
  income: number;
  expenses: number;
  profit: number;
  margin: number | null;
}

export function summarizeFinancials(
  rows: ProjectFinancialsRow[],
  projectCurrency: string,
): ProjectFinancials[] {
  const totals = new Map<string, { income: number; expenses: number }>();

  for (const row of rows) {
    const current = totals.get(row.currency) ?? { income: 0, expenses: 0 };
    current.income += row.income;
    current.expenses += row.expenses;
    totals.set(row.currency, current);
  }

  if (!totals.has(projectCurrency)) {
    totals.set(projectCurrency, { income: 0, expenses: 0 });
  }

  return [...totals.entries()]
    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
    .map(([currency, values]) => {
      const profit = values.income - values.expenses;

      return {
        currency,
        income: values.income,
        expenses: values.expenses,
        profit,
        margin: values.income > 0 ? profit / values.income : null,
      };
    });
}
