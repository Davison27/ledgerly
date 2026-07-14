import type { ProjectDocument, DocumentType } from '../../../../data/documents';

export interface DashboardData {
  income: number;
  expenses: number;
  paid: number;
  pending: number;
  overdue: number;
  monthlyIncome: number[];
  monthlyExpenses: number[];
  categoryTotals: Record<DocumentType, number>;
  totalDocs: number;
}

export function deriveDashboardData(docs: ProjectDocument[]): DashboardData {
  const monthlyIncome = Array<number>(12).fill(0);
  const monthlyExpenses = Array<number>(12).fill(0);
  const categoryTotals: Record<DocumentType, number> = {
    factura: 0,
    nomina: 0,
    impuesto: 0,
  };

  let income = 0;
  let expenses = 0;
  let paid = 0;
  let pending = 0;
  let overdue = 0;

  for (const doc of docs) {
    const idx = doc.month - 1;
    const inRange = idx >= 0 && idx < 12;

    if (doc.type === 'factura') {
      income += doc.amount;
      if (inRange) monthlyIncome[idx] += doc.amount;
    } else {
      expenses += doc.amount;
      if (inRange) monthlyExpenses[idx] += doc.amount;
    }

    categoryTotals[doc.type] += doc.amount;

    if (doc.status === 'pagado') paid += 1;
    else if (doc.status === 'pendiente') pending += 1;
    else if (doc.status === 'vencido') overdue += 1;
  }

  return {
    income,
    expenses,
    paid,
    pending,
    overdue,
    monthlyIncome,
    monthlyExpenses,
    categoryTotals,
    totalDocs: docs.length,
  };
}

export function formatEur(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}
