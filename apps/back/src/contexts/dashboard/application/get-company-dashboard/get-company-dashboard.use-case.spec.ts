import { GetCompanyDashboardUseCase } from './get-company-dashboard.use-case';
import { DocumentRepository } from '../../../documents/domain/document.repository';
import { DocumentDashboardRow } from '../../../documents/domain/document-dashboard-row';
import { Document } from '../../../documents/domain/document';
import { ProjectRepository } from '../../../projects/domain/project.repository';
import { ProjectSummary } from '../../../projects/domain/project-summary';
import { Project } from '../../../projects/domain/project';

class FakeDocumentRepository implements DocumentRepository {
  constructor(private readonly rows: DocumentDashboardRow[]) {}

  findAllForDashboard(): Promise<DocumentDashboardRow[]> {
    return Promise.resolve(this.rows);
  }

  findByProject(): Promise<Document[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<Document | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  saveContent(): Promise<void> {
    return Promise.resolve();
  }

  findContent(): Promise<Buffer | null> {
    return Promise.resolve(null);
  }
}

class FakeProjectRepository implements ProjectRepository {
  constructor(private readonly summaries: ProjectSummary[]) {}

  findAllSummaries(): Promise<ProjectSummary[]> {
    return Promise.resolve(this.summaries);
  }

  findSummaryById(): Promise<ProjectSummary | null> {
    return Promise.resolve(null);
  }

  findById(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  findByCode(): Promise<Project | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

function buildRow(overrides: Partial<DocumentDashboardRow> = {}): DocumentDashboardRow {
  return {
    type: 'factura',
    amount: 100,
    month: 1,
    status: 'pagado',
    issuerName: 'Acme SL',
    projectId: 'project-1',
    ...overrides,
  };
}

function buildSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 'project-1',
    name: 'Project One',
    code: 'P1',
    documentCount: 0,
    pendingCount: 0,
    image: null,
    ...overrides,
  };
}

describe('GetCompanyDashboardUseCase', () => {
  it('returns all-zero, empty-array data when there are no documents or projects', async () => {
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDocumentRepository([]),
      new FakeProjectRepository([]),
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      projectCount: 0,
      totalDocuments: 0,
      income: 0,
      expenses: 0,
      profit: 0,
      margin: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      amountByStatus: { pagado: 0, pendiente: 0, vencido: 0 },
      monthlyIncome: Array(12).fill(0),
      monthlyExpenses: Array(12).fill(0),
      monthlyProfit: Array(12).fill(0),
      cumulativeProfit: Array(12).fill(0),
      monthlyMargin: Array(12).fill(0),
      categoryTotals: { factura: 0, nomina: 0, impuesto: 0 },
      topIssuers: [],
      topProjects: [],
    });
  });

  it('aggregates income, expenses, profit and margin across projects', async () => {
    const rows: DocumentDashboardRow[] = [
      buildRow({ type: 'factura', amount: 1000, month: 1, status: 'pagado', projectId: 'p1', issuerName: 'Client A' }),
      buildRow({ type: 'nomina', amount: 300, month: 1, status: 'pendiente', projectId: 'p1', issuerName: 'Employee' }),
      buildRow({ type: 'impuesto', amount: 100, month: 2, status: 'vencido', projectId: 'p2', issuerName: null }),
    ];
    const summaries = [buildSummary({ id: 'p1', name: 'Project One' }), buildSummary({ id: 'p2', name: 'Project Two' })];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDocumentRepository(rows),
      new FakeProjectRepository(summaries),
    );

    const result = await useCase.execute();

    expect(result.projectCount).toBe(2);
    expect(result.totalDocuments).toBe(3);
    expect(result.income).toBe(1000);
    expect(result.expenses).toBe(400);
    expect(result.profit).toBe(600);
    expect(result.margin).toBeCloseTo(0.6);
    expect(result.paidCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.amountByStatus).toEqual({ pagado: 1000, pendiente: 300, vencido: 100 });
    expect(result.categoryTotals).toEqual({ factura: 1000, nomina: 300, impuesto: 100 });

    expect(result.monthlyIncome[0]).toBe(1000);
    expect(result.monthlyExpenses[0]).toBe(300);
    expect(result.monthlyExpenses[1]).toBe(100);
    expect(result.monthlyProfit[0]).toBe(700);
    expect(result.monthlyProfit[1]).toBe(-100);
    expect(result.cumulativeProfit[0]).toBe(700);
    expect(result.cumulativeProfit[1]).toBe(600);
    expect(result.monthlyMargin[0]).toBeCloseTo(0.7);
    expect(result.monthlyMargin[1]).toBe(0);

    expect(result.topIssuers).toEqual([
      { key: 'Client A', name: 'Client A', total: 1000 },
      { key: 'Employee', name: 'Employee', total: 300 },
      { key: 'unknown', name: null, total: 100 },
    ]);

    expect(result.topProjects).toEqual([
      { id: 'p1', name: 'Project One', documentCount: 2, total: 1300 },
      { id: 'p2', name: 'Project Two', documentCount: 1, total: 100 },
    ]);
  });

  it('buckets issuers beyond the top 6 into an "other" entry sorted by total', async () => {
    const rows: DocumentDashboardRow[] = [
      buildRow({ issuerName: 'Issuer A', amount: 700 }),
      buildRow({ issuerName: 'Issuer B', amount: 600 }),
      buildRow({ issuerName: 'Issuer C', amount: 500 }),
      buildRow({ issuerName: 'Issuer D', amount: 400 }),
      buildRow({ issuerName: 'Issuer E', amount: 300 }),
      buildRow({ issuerName: 'Issuer F', amount: 200 }),
      buildRow({ issuerName: 'Issuer G', amount: 50 }),
      buildRow({ issuerName: 'Issuer H', amount: 10 }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDocumentRepository(rows),
      new FakeProjectRepository([buildSummary()]),
    );

    const result = await useCase.execute();

    expect(result.topIssuers).toHaveLength(7);
    expect(result.topIssuers.slice(0, 6).map((issuer) => issuer.key)).toEqual([
      'Issuer A',
      'Issuer B',
      'Issuer C',
      'Issuer D',
      'Issuer E',
      'Issuer F',
    ]);
    expect(result.topIssuers[6]).toEqual({ key: 'other', name: null, total: 60 });
  });

  it('trims and treats blank issuer names as unknown, and orders top projects by total descending', async () => {
    const rows: DocumentDashboardRow[] = [
      buildRow({ issuerName: '  ', amount: 10, projectId: 'p-small' }),
      buildRow({ issuerName: null, amount: 20, projectId: 'p-small' }),
      buildRow({ issuerName: 'Big Client', amount: 900, projectId: 'p-big' }),
    ];
    const summaries = [
      buildSummary({ id: 'p-small', name: 'Small Project' }),
      buildSummary({ id: 'p-big', name: 'Big Project' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDocumentRepository(rows),
      new FakeProjectRepository(summaries),
    );

    const result = await useCase.execute();

    expect(result.topIssuers).toEqual([
      { key: 'Big Client', name: 'Big Client', total: 900 },
      { key: 'unknown', name: null, total: 30 },
    ]);
    expect(result.topProjects).toEqual([
      { id: 'p-big', name: 'Big Project', documentCount: 1, total: 900 },
      { id: 'p-small', name: 'Small Project', documentCount: 2, total: 30 },
    ]);
  });

  it('limits topProjects to the top 5 by total amount', async () => {
    const rows: DocumentDashboardRow[] = Array.from({ length: 6 }, (_, i) =>
      buildRow({ projectId: `p${i}`, amount: (i + 1) * 100 }),
    );
    const summaries = Array.from({ length: 6 }, (_, i) => buildSummary({ id: `p${i}`, name: `Project ${i}` }));
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDocumentRepository(rows),
      new FakeProjectRepository(summaries),
    );

    const result = await useCase.execute();

    expect(result.topProjects).toHaveLength(5);
    expect(result.topProjects.map((p) => p.id)).toEqual(['p5', 'p4', 'p3', 'p2', 'p1']);
    expect(result.projectCount).toBe(6);
  });
});
