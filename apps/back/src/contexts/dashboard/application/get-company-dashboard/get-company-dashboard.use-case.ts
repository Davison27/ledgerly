import { Inject, Injectable } from '@nestjs/common';
import {
  DOCUMENT_REPOSITORY,
  DocumentRepository,
} from '../../../documents/domain/document.repository';
import { DocumentDashboardRow } from '../../../documents/domain/document-dashboard-row';
import { deriveEffectiveStatus } from '../../../documents/domain/effective-status';
import {
  PROJECT_REPOSITORY,
  ProjectDashboardRow,
  ProjectRepository,
} from '../../../projects/domain/project.repository';
import {
  AmountByStatus,
  BudgetVsActual,
  CashflowForecast,
  CategoryTotals,
  CompanyDashboard,
  PreviousYearSummary,
  TopIssuer,
  TopProject,
  VatByQuarter,
} from '../../domain/company-dashboard';

const TOP_ISSUERS_LIMIT = 6;
const TOP_PROJECTS_LIMIT = 5;
const MONTHS_IN_YEAR = 12;
const QUARTERS_IN_YEAR = 4;
const CASHFLOW_FORECAST_MONTHS = 6;

interface HeadlineTotals {
  income: number;
  expenses: number;
  profit: number;
  margin: number;
  totalDocuments: number;
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function computeHeadlineTotals(rows: DocumentDashboardRow[]): HeadlineTotals {
  let income = 0;
  let expenses = 0;

  for (const row of rows) {
    if (row.type === 'factura') income += row.amount;
    else expenses += row.amount;
  }

  const profit = income - expenses;
  const margin = income > 0 ? profit / income : 0;

  return { income, expenses, profit, margin, totalDocuments: rows.length };
}

function computeAvailableYears(rows: DocumentDashboardRow[], today: Date): number[] {
  const years = new Set<number>(rows.map((row) => yearOf(row.date)));
  years.add(today.getFullYear());

  return Array.from(years).sort((a, b) => b - a);
}

function computeVatByQuarter(rows: DocumentDashboardRow[]): VatByQuarter[] {
  const quarters: VatByQuarter[] = Array.from({ length: QUARTERS_IN_YEAR }, (_, i) => ({
    quarter: i + 1,
    outputVat: 0,
    inputVat: 0,
    balance: 0,
  }));

  for (const row of rows) {
    const quarterIdx = Math.ceil(row.month / 3) - 1;
    if (quarterIdx < 0 || quarterIdx >= QUARTERS_IN_YEAR) continue;

    const tax = row.taxAmount ?? 0;
    if (row.type === 'factura') quarters[quarterIdx].outputVat += tax;
    else quarters[quarterIdx].inputVat += tax;
  }

  for (const quarter of quarters) {
    quarter.balance = quarter.outputVat - quarter.inputVat;
  }

  return quarters;
}

function computeBudgetVsActual(
  yearRows: DocumentDashboardRow[],
  projectRows: ProjectDashboardRow[],
): BudgetVsActual[] {
  const activityByProject = new Map<string, { income: number; expenses: number }>();

  for (const row of yearRows) {
    const activity = activityByProject.get(row.projectId) ?? { income: 0, expenses: 0 };
    if (row.type === 'factura') activity.income += row.amount;
    else activity.expenses += row.amount;
    activityByProject.set(row.projectId, activity);
  }

  const projectById = new Map(projectRows.map((project) => [project.id, project]));

  const projectIds = new Set<string>(activityByProject.keys());
  for (const project of projectRows) {
    if (project.budget !== null) projectIds.add(project.id);
  }

  const result: BudgetVsActual[] = Array.from(projectIds).map((projectId) => {
    const project = projectById.get(projectId) ?? null;
    const activity = activityByProject.get(projectId) ?? { income: 0, expenses: 0 };
    const budget = project?.budget ?? null;
    const consumptionPct = budget !== null && budget > 0 ? activity.expenses / budget : null;

    return {
      projectId,
      name: project?.name ?? '',
      currency: project?.currency ?? 'EUR',
      budget,
      income: activity.income,
      expenses: activity.expenses,
      consumptionPct,
    };
  });

  return result.sort((a, b) => b.expenses - a.expenses);
}

function computeCashflowForecast(allRows: DocumentDashboardRow[], today: Date): CashflowForecast {
  const todayIso = formatDate(today);
  const monthKeys = Array.from({ length: CASHFLOW_FORECAST_MONTHS }, (_, i) =>
    formatYearMonth(addMonths(today, i + 1)),
  );
  const monthBuckets = new Map(
    monthKeys.map((month) => [month, { month, inflow: 0, outflow: 0, net: 0 }]),
  );

  let overdueInflow = 0;
  let overdueOutflow = 0;

  for (const row of allRows) {
    if (row.status === 'pagado' || row.dueDate === null) continue;

    const isInflow = row.type === 'factura';

    if (row.dueDate < todayIso) {
      if (isInflow) overdueInflow += row.amount;
      else overdueOutflow += row.amount;
      continue;
    }

    const bucket = monthBuckets.get(row.dueDate.slice(0, 7));
    if (!bucket) continue;

    if (isInflow) bucket.inflow += row.amount;
    else bucket.outflow += row.amount;
  }

  const months = monthKeys.map((month) => {
    const bucket = monthBuckets.get(month)!;
    return { month, inflow: bucket.inflow, outflow: bucket.outflow, net: bucket.inflow - bucket.outflow };
  });

  return {
    overdue: { inflow: overdueInflow, outflow: overdueOutflow, net: overdueInflow - overdueOutflow },
    months,
  };
}

@Injectable()
export class GetCompanyDashboardUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(year?: number): Promise<CompanyDashboard> {
    const today = new Date();
    const todayIso = formatDate(today);
    const selectedYear = year ?? today.getFullYear();

    const [rows, summaries, projectRows] = await Promise.all([
      this.documentRepository.findAllForDashboard(),
      this.projectRepository.findAllSummaries(),
      this.projectRepository.findAllForDashboard(),
    ]);

    const yearRows = rows.filter((row) => yearOf(row.date) === selectedYear);
    const previousYearRows = rows.filter((row) => yearOf(row.date) === selectedYear - 1);

    const monthlyIncome = Array<number>(MONTHS_IN_YEAR).fill(0);
    const monthlyExpenses = Array<number>(MONTHS_IN_YEAR).fill(0);
    const categoryTotals: CategoryTotals = { factura: 0, nomina: 0, impuesto: 0 };
    const amountByStatus: AmountByStatus = { pagado: 0, pendiente: 0, vencido: 0 };

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const issuerTotals = new Map<string, { name: string | null; total: number }>();
    const projectTotals = new Map<string, { documentCount: number; total: number }>();

    for (const row of yearRows) {
      const idx = row.month - 1;
      const inRange = idx >= 0 && idx < MONTHS_IN_YEAR;

      if (row.type === 'factura') {
        if (inRange) monthlyIncome[idx] += row.amount;
      } else {
        if (inRange) monthlyExpenses[idx] += row.amount;
      }

      categoryTotals[row.type] += row.amount;

      const effectiveStatus = deriveEffectiveStatus(row.status, row.dueDate, todayIso);
      if (effectiveStatus === 'pagado') paidCount += 1;
      else if (effectiveStatus === 'pendiente') pendingCount += 1;
      else if (effectiveStatus === 'vencido') overdueCount += 1;

      amountByStatus[effectiveStatus] += row.amount;

      const issuerName = row.issuerName?.trim() || null;
      const issuerKey = issuerName ?? 'unknown';
      const existingIssuer = issuerTotals.get(issuerKey);
      if (existingIssuer) {
        existingIssuer.total += row.amount;
      } else {
        issuerTotals.set(issuerKey, { name: issuerName, total: row.amount });
      }

      const existingProject = projectTotals.get(row.projectId);
      if (existingProject) {
        existingProject.documentCount += 1;
        existingProject.total += row.amount;
      } else {
        projectTotals.set(row.projectId, { documentCount: 1, total: row.amount });
      }
    }

    const monthlyProfit = monthlyIncome.map((value, i) => value - monthlyExpenses[i]);
    const cumulativeProfit = monthlyProfit.reduce<number[]>((acc, value, i) => {
      acc.push((acc[i - 1] ?? 0) + value);
      return acc;
    }, []);
    const monthlyMargin = monthlyIncome.map((value, i) =>
      value > 0 ? monthlyProfit[i] / value : 0,
    );

    const sortedIssuers = Array.from(issuerTotals.entries())
      .map(([key, { name, total }]) => ({ key, name, total }))
      .sort((a, b) => b.total - a.total);

    const topIssuers: TopIssuer[] = sortedIssuers.slice(0, TOP_ISSUERS_LIMIT);
    const restIssuers = sortedIssuers.slice(TOP_ISSUERS_LIMIT);
    if (restIssuers.length > 0) {
      topIssuers.push({
        key: 'other',
        name: null,
        total: restIssuers.reduce((acc, issuer) => acc + issuer.total, 0),
      });
    }

    const projectNameById = new Map(summaries.map((project) => [project.id, project.name]));
    const topProjects: TopProject[] = Array.from(projectTotals.entries())
      .map(([id, { documentCount, total }]) => ({
        id,
        name: projectNameById.get(id) ?? '',
        documentCount,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_PROJECTS_LIMIT);

    const { income, expenses, profit, margin } = computeHeadlineTotals(yearRows);

    const previousYear: PreviousYearSummary = {
      year: selectedYear - 1,
      ...computeHeadlineTotals(previousYearRows),
    };

    return {
      year: selectedYear,
      availableYears: computeAvailableYears(rows, today),
      projectCount: summaries.length,
      totalDocuments: yearRows.length,
      income,
      expenses,
      profit,
      margin,
      paidCount,
      pendingCount,
      overdueCount,
      amountByStatus,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit,
      cumulativeProfit,
      monthlyMargin,
      categoryTotals,
      topIssuers,
      topProjects,
      previousYear,
      budgetVsActual: computeBudgetVsActual(yearRows, projectRows),
      vatByQuarter: computeVatByQuarter(yearRows),
      cashflowForecast: computeCashflowForecast(rows, today),
    };
  }
}
