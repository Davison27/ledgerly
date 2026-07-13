import type { ProjectDocument, DocumentType } from '../../../../data/documents';

/** Datos del panel derivados de los documentos del proyecto. */
export interface DashboardData {
  /** Suma de importes de facturas. */
  income: number;
  /** Suma de importes de nóminas + impuestos. */
  expenses: number;
  paid: number;
  pending: number;
  overdue: number;
  /** Ingresos por mes (índice 0 = enero … 11 = diciembre). */
  monthlyIncome: number[];
  /** Gastos por mes (índice 0 = enero … 11 = diciembre). */
  monthlyExpenses: number[];
  /** Importe total por categoría/tipo de documento. */
  categoryTotals: Record<DocumentType, number>;
  totalDocs: number;
}

/** Deriva todas las métricas del panel a partir de los documentos. */
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

/** Formatea un importe como euros sin decimales (locale es-ES). */
export function formatEur(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}
