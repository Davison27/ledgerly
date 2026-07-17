import { Inject, Injectable } from '@nestjs/common';
import {
  DOCUMENT_REPOSITORY,
  DocumentRepository,
} from '../../../documents/domain/document.repository';
import {
  PROJECT_REPOSITORY,
  ProjectRepository,
} from '../../../projects/domain/project.repository';
import {
  AmountByStatus,
  CategoryTotals,
  CompanyDashboard,
  TopIssuer,
  TopProject,
} from '../../domain/company-dashboard';

const TOP_ISSUERS_LIMIT = 6;
const TOP_PROJECTS_LIMIT = 5;
const MONTHS_IN_YEAR = 12;

@Injectable()
export class GetCompanyDashboardUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly documentRepository: DocumentRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(): Promise<CompanyDashboard> {
    const [rows, projects] = await Promise.all([
      this.documentRepository.findAllForDashboard(),
      this.projectRepository.findAllSummaries(),
    ]);

    const monthlyIncome = Array<number>(MONTHS_IN_YEAR).fill(0);
    const monthlyExpenses = Array<number>(MONTHS_IN_YEAR).fill(0);
    const categoryTotals: CategoryTotals = { factura: 0, nomina: 0, impuesto: 0 };
    const amountByStatus: AmountByStatus = { pagado: 0, pendiente: 0, vencido: 0 };

    let income = 0;
    let expenses = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const issuerTotals = new Map<string, { name: string | null; total: number }>();
    const projectTotals = new Map<string, { documentCount: number; total: number }>();

    for (const row of rows) {
      const idx = row.month - 1;
      const inRange = idx >= 0 && idx < MONTHS_IN_YEAR;

      if (row.type === 'factura') {
        income += row.amount;
        if (inRange) monthlyIncome[idx] += row.amount;
      } else {
        expenses += row.amount;
        if (inRange) monthlyExpenses[idx] += row.amount;
      }

      categoryTotals[row.type] += row.amount;

      if (row.status === 'pagado') paidCount += 1;
      else if (row.status === 'pendiente') pendingCount += 1;
      else if (row.status === 'vencido') overdueCount += 1;

      amountByStatus[row.status] += row.amount;

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

    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
    const topProjects: TopProject[] = Array.from(projectTotals.entries())
      .map(([id, { documentCount, total }]) => ({
        id,
        name: projectNameById.get(id) ?? '',
        documentCount,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_PROJECTS_LIMIT);

    const profit = income - expenses;
    const margin = income > 0 ? profit / income : 0;

    return {
      projectCount: projects.length,
      totalDocuments: rows.length,
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
    };
  }
}
