import type { ProjectDocument, DocumentType } from '@/entities/document';
import { CHART_VIVID_DARK, CHART_VIVID_LIGHT } from '@/shared/config/theme';

export interface AmountByStatus {
  pagado: number;
  pendiente: number;
  vencido: number;
}

export interface TopIssuer {
  key: string;
  name: string | null;
  total: number;
}

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
  profit: number;
  margin: number;
  monthlyProfit: number[];
  cumulativeProfit: number[];
  monthlyMargin: number[];
  amountByStatus: AmountByStatus;
  topIssuers: TopIssuer[];
}

export interface ManualExpense {
  amount: number;
  date: string;
}

const TOP_ISSUERS_LIMIT = 6;

export function deriveDashboardData(docs: ProjectDocument[], manualExpenses: ManualExpense[] = []): DashboardData {
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

  const amountByStatus: AmountByStatus = {
    pagado: 0,
    pendiente: 0,
    vencido: 0,
  };

  const issuerTotals = new Map<string, { name: string | null; total: number }>();

  for (const doc of docs) {
    const idx = doc.month - 1;
    const inRange = idx >= 0 && idx < 12;

    if (doc.direction === 'ingreso') {
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

    amountByStatus[doc.status] += doc.amount;

    const issuerName = doc.issuerName?.trim() || null;
    const issuerKey = issuerName ?? 'unknown';
    const existing = issuerTotals.get(issuerKey);
    if (existing) {
      existing.total += doc.amount;
    } else {
      issuerTotals.set(issuerKey, { name: issuerName, total: doc.amount });
    }
  }

  for (const expense of manualExpenses) {
    expenses += expense.amount;
    const index = Number(expense.date.slice(5, 7)) - 1;
    if (index >= 0 && index < 12) monthlyExpenses[index] += expense.amount;
  }

  const monthlyProfit = monthlyIncome.map((v, i) => v - monthlyExpenses[i]);
  const cumulativeProfit = monthlyProfit.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v);
    return acc;
  }, []);
  const monthlyMargin = monthlyIncome.map((v, i) =>
    v > 0 ? monthlyProfit[i] / v : 0,
  );

  const sortedIssuers = Array.from(issuerTotals.entries())
    .map(([key, { name, total }]) => ({ key, name, total }))
    .sort((a, b) => b.total - a.total);

  const topIssuers: TopIssuer[] = sortedIssuers.slice(0, TOP_ISSUERS_LIMIT);
  const rest = sortedIssuers.slice(TOP_ISSUERS_LIMIT);
  if (rest.length > 0) {
    topIssuers.push({
      key: 'other',
      name: null,
      total: rest.reduce((acc, r) => acc + r.total, 0),
    });
  }

  const profit = income - expenses;
  const margin = income > 0 ? profit / income : 0;

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
    profit,
    margin,
    monthlyProfit,
    cumulativeProfit,
    monthlyMargin,
    amountByStatus,
    topIssuers,
  };
}

export function vividOverdue(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? CHART_VIVID_DARK.overdue : CHART_VIVID_LIGHT.overdue;
}

export function formatEur(n: number): string {
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}
