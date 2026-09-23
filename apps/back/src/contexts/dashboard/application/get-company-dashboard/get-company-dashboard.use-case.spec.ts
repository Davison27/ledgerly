import { GetCompanyDashboardUseCase } from './get-company-dashboard.use-case';
import type { DashboardAccessSnapshot } from './get-company-dashboard.use-case';
import {
  DashboardDataProvider,
  DashboardDocumentRow,
  DashboardProjectRow,
  DashboardLeaseExpenseRow,
} from '../../domain/dashboard-data-provider.port';
import { SystemClock } from '../../../../shared/infrastructure/system-clock';

const fullAccess: DashboardAccessSnapshot = {
  projects: true,
  documents: true,
  suppliers: true,
  staff: true,
  equipment: true,
};

class FakeDashboardDataProvider implements DashboardDataProvider {
  constructor(
    private readonly rows: DashboardDocumentRow[],
    private readonly projectRows: DashboardProjectRow[] = [],
    private readonly leaseExpenses: DashboardLeaseExpenseRow[] = [],
  ) {}

  findAllDocumentRows(): Promise<DashboardDocumentRow[]> {
    return Promise.resolve(this.rows);
  }

  findAllProjectRows(): Promise<DashboardProjectRow[]> {
    return Promise.resolve(this.projectRows);
  }

  findAllLeaseExpenseRows(): Promise<DashboardLeaseExpenseRow[]> {
    return Promise.resolve(this.leaseExpenses);
  }
}

function buildRow(overrides: Partial<DashboardDocumentRow> = {}): DashboardDocumentRow {
  return {
    type: 'invoice',
    amount: 100,
    month: 1,
    status: 'paid',
    issuerName: 'Acme SL',
    projectId: 'project-1',
    date: '2026-01-15',
    dueDate: null,
    taxAmount: null,
    direction: 'income',
    ...overrides,
  };
}

function buildProjectDashboardRow(
  overrides: Partial<DashboardProjectRow> = {},
): DashboardProjectRow {
  return {
    id: 'project-1',
    name: 'Project One',
    budget: null,
    currency: 'EUR',
    ...overrides,
  };
}

function mockToday(isoDate: string): void {
  jest.useFakeTimers().setSystemTime(new Date(isoDate));
}

describe('GetCompanyDashboardUseCase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns all-zero, empty-array data when there are no documents or projects', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider([], []),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess);

    expect(result).toEqual({
      year: 2026,
      availableYears: [2026],
      projectCount: 0,
      totalDocuments: 0,
      income: 0,
      expenses: 0,
      profit: 0,
      margin: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      amountByStatus: { paid: 0, pending: 0, overdue: 0 },
      monthlyIncome: Array(12).fill(0),
      monthlyExpenses: Array(12).fill(0),
      monthlyProfit: Array(12).fill(0),
      cumulativeProfit: Array(12).fill(0),
      monthlyMargin: Array(12).fill(0),
      categoryTotals: { invoice: 0, payroll: 0, tax: 0 },
      topIssuers: [],
      topProjects: [],
      previousYear: {
        year: 2025,
        income: 0,
        expenses: 0,
        profit: 0,
        margin: 0,
        totalDocuments: 0,
      },
      budgetVsActual: [],
      vatByQuarter: [
        { quarter: 1, outputVat: 0, inputVat: 0, balance: 0 },
        { quarter: 2, outputVat: 0, inputVat: 0, balance: 0 },
        { quarter: 3, outputVat: 0, inputVat: 0, balance: 0 },
        { quarter: 4, outputVat: 0, inputVat: 0, balance: 0 },
      ],
      cashflowForecast: {
        overdue: { inflow: 0, outflow: 0, net: 0 },
        months: [
          { month: '2026-08', inflow: 0, outflow: 0, net: 0 },
          { month: '2026-09', inflow: 0, outflow: 0, net: 0 },
          { month: '2026-10', inflow: 0, outflow: 0, net: 0 },
          { month: '2026-11', inflow: 0, outflow: 0, net: 0 },
          { month: '2026-12', inflow: 0, outflow: 0, net: 0 },
          { month: '2027-01', inflow: 0, outflow: 0, net: 0 },
        ],
      },
    });
  });

  it('aggregates income, expenses, profit and margin across projects for the selected year', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ type: 'invoice', amount: 1000, month: 1, status: 'paid', projectId: 'p1', issuerName: 'Client A', date: '2026-01-05' }),
      buildRow({ type: 'payroll', direction: 'expense', amount: 300, month: 1, status: 'pending', projectId: 'p1', issuerName: 'Employee', date: '2026-01-20' }),
      buildRow({ type: 'tax', direction: 'expense', amount: 100, month: 2, status: 'overdue', projectId: 'p2', issuerName: null, date: '2026-02-01' }),
    ];
    const projectRows = [
      buildProjectDashboardRow({ id: 'p1', name: 'Project One' }),
      buildProjectDashboardRow({ id: 'p2', name: 'Project Two' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, projectRows),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.year).toBe(2026);
    expect(result.projectCount).toBe(2);
    expect(result.totalDocuments).toBe(3);
    expect(result.income).toBe(1000);
    expect(result.expenses).toBe(400);
    expect(result.profit).toBe(600);
    expect(result.margin).toBeCloseTo(0.6);
    expect(result.paidCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.amountByStatus).toEqual({ paid: 1000, pending: 300, overdue: 100 });
    expect(result.categoryTotals).toEqual({ invoice: 1000, payroll: 300, tax: 100 });

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

  it('counts a document that already arrives with an overdue effective status', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ type: 'invoice', amount: 500, status: 'overdue', dueDate: '2026-07-01', date: '2026-06-01' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, []),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.overdueCount).toBe(1);
    expect(result.pendingCount).toBe(0);
    expect(result.paidCount).toBe(0);
    expect(result.amountByStatus).toEqual({ paid: 0, pending: 0, overdue: 500 });
  });

  it('excludes documents from other years and buckets by month within the selected year only', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ amount: 1000, month: 1, date: '2026-01-10' }),
      buildRow({ amount: 500, month: 1, date: '2025-01-10' }),
      buildRow({ amount: 200, month: 12, date: '2024-12-31' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, [buildProjectDashboardRow()]),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.totalDocuments).toBe(1);
    expect(result.income).toBe(1000);
    expect(result.monthlyIncome[0]).toBe(1000);
    expect(result.availableYears).toEqual([2026, 2025, 2024]);
  });

  it('computes availableYears as distinct document years plus the current calendar year, descending', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ date: '2023-05-01' }),
      buildRow({ date: '2021-05-01' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, []),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2021);

    expect(result.availableYears).toEqual([2026, 2023, 2021]);
  });

  it('defaults to the current calendar year when no year is provided', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider([], []),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess);

    expect(result.year).toBe(2026);
  });

  it('computes previousYear headline totals from the prior calendar year documents only', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ type: 'invoice', amount: 1000, date: '2026-03-01' }),
      buildRow({ type: 'invoice', amount: 400, date: '2025-03-01' }),
      buildRow({ type: 'payroll', direction: 'expense', amount: 100, date: '2025-04-01' }),
      buildRow({ type: 'invoice', amount: 999, date: '2024-01-01' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, []),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.previousYear).toEqual({
      year: 2025,
      income: 400,
      expenses: 100,
      profit: 300,
      margin: 0.75,
      totalDocuments: 2,
    });
  });

  it('buckets issuers beyond the top 6 into an "other" entry sorted by total', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
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
      new FakeDashboardDataProvider(rows, [buildProjectDashboardRow()]),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

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
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = [
      buildRow({ issuerName: '  ', amount: 10, projectId: 'p-small' }),
      buildRow({ issuerName: null, amount: 20, projectId: 'p-small' }),
      buildRow({ issuerName: 'Big Client', amount: 900, projectId: 'p-big' }),
    ];
    const projectRows = [
      buildProjectDashboardRow({ id: 'p-small', name: 'Small Project' }),
      buildProjectDashboardRow({ id: 'p-big', name: 'Big Project' }),
    ];
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, projectRows),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

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
    mockToday('2026-07-18T12:00:00.000Z');
    const rows: DashboardDocumentRow[] = Array.from({ length: 6 }, (_, i) =>
      buildRow({ projectId: `p${i}`, amount: (i + 1) * 100 }),
    );
    const projectRows = Array.from({ length: 6 }, (_, i) => buildProjectDashboardRow({ id: `p${i}`, name: `Project ${i}` }));
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(rows, projectRows),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.topProjects).toHaveLength(5);
    expect(result.topProjects.map((p) => p.id)).toEqual(['p5', 'p4', 'p3', 'p2', 'p1']);
    expect(result.projectCount).toBe(6);
  });

  describe('budgetVsActual', () => {
    it('includes projects with a budget or activity in the selected year, sorted by expenses desc', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const rows: DashboardDocumentRow[] = [
        buildRow({ projectId: 'p1', type: 'invoice', amount: 500, date: '2026-02-01' }),
        buildRow({ projectId: 'p1', type: 'payroll', direction: 'expense', amount: 200, date: '2026-03-01' }),
        buildRow({ projectId: 'p2', type: 'tax', direction: 'expense', amount: 900, date: '2026-04-01' }),
        buildRow({ projectId: 'p3', type: 'invoice', amount: 50, date: '2025-04-01' }),
      ];
      const projectRows = [
        buildProjectDashboardRow({ id: 'p1', name: 'Project One', budget: 1000, currency: 'EUR' }),
        buildProjectDashboardRow({ id: 'p2', name: 'Project Two', budget: null, currency: 'USD' }),
        buildProjectDashboardRow({ id: 'p3', name: 'Project Three', budget: 300, currency: 'EUR' }),
      ];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider(rows, projectRows),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2026);

      expect(result.budgetVsActual).toEqual([
        { projectId: 'p2', name: 'Project Two', currency: 'USD', budget: null, income: 0, expenses: 900, consumptionPct: null },
        { projectId: 'p1', name: 'Project One', currency: 'EUR', budget: 1000, income: 500, expenses: 200, consumptionPct: 0.2 },
        { projectId: 'p3', name: 'Project Three', currency: 'EUR', budget: 300, income: 0, expenses: 0, consumptionPct: 0 },
      ]);
    });

    it('excludes projects with neither a budget nor activity in the selected year', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const projectRows = [buildProjectDashboardRow({ id: 'idle', budget: null })];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider([], projectRows),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2026);

      expect(result.budgetVsActual).toEqual([]);
    });
  });

  describe('vatByQuarter', () => {
    it('always returns 4 quarters and sums output/input VAT, treating null taxAmount as 0', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const rows: DashboardDocumentRow[] = [
        buildRow({ type: 'invoice', month: 1, taxAmount: 210, date: '2026-01-05' }),
        buildRow({ type: 'payroll', direction: 'expense', month: 2, taxAmount: 50, date: '2026-02-05' }),
        buildRow({ type: 'tax', direction: 'expense', month: 5, taxAmount: 30, date: '2026-05-05' }),
        buildRow({ type: 'invoice', month: 8, taxAmount: null, date: '2026-08-05' }),
        buildRow({ type: 'payroll', direction: 'expense', month: 11, taxAmount: 20, date: '2026-11-05' }),
      ];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider(rows, []),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2026);

      expect(result.vatByQuarter).toEqual([
        { quarter: 1, outputVat: 210, inputVat: 50, balance: 160 },
        { quarter: 2, outputVat: 0, inputVat: 30, balance: -30 },
        { quarter: 3, outputVat: 0, inputVat: 0, balance: 0 },
        { quarter: 4, outputVat: 0, inputVat: 20, balance: -20 },
      ]);
    });
  });

  describe('cashflowForecast', () => {
    it('buckets overdue vs upcoming documents, excludes paid documents, and computes inflow/outflow by type', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const rows: DashboardDocumentRow[] = [
        buildRow({ type: 'invoice', amount: 500, status: 'overdue', dueDate: '2026-06-01', date: '2026-05-01' }),
        buildRow({ type: 'payroll', direction: 'expense', amount: 150, status: 'overdue', dueDate: '2026-07-01', date: '2026-06-01' }),
        buildRow({ type: 'invoice', amount: 9999, status: 'paid', dueDate: '2026-06-01', date: '2026-05-01' }),
        buildRow({ type: 'invoice', amount: 9999, status: 'pending', dueDate: null, date: '2026-05-01' }),
        buildRow({ type: 'invoice', amount: 300, status: 'pending', dueDate: '2026-08-10', date: '2026-07-01' }),
        buildRow({ type: 'tax', direction: 'expense', amount: 80, status: 'pending', dueDate: '2026-08-20', date: '2026-07-01' }),
        buildRow({ type: 'invoice', amount: 60, status: 'pending', dueDate: '2027-01-15', date: '2026-07-01' }),
        buildRow({ type: 'invoice', amount: 70, status: 'pending', dueDate: '2027-02-01', date: '2026-07-01' }),
      ];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider(rows, []),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2026);

      expect(result.cashflowForecast.overdue).toEqual({ inflow: 500, outflow: 150, net: 350 });
      expect(result.cashflowForecast.months).toEqual([
        { month: '2026-08', inflow: 300, outflow: 80, net: 220 },
        { month: '2026-09', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-10', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-11', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-12', inflow: 0, outflow: 0, net: 0 },
        { month: '2027-01', inflow: 60, outflow: 0, net: 60 },
      ]);
    });

    it('is not scoped to the selected year', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const rows: DashboardDocumentRow[] = [
        buildRow({ type: 'invoice', amount: 40, status: 'pending', dueDate: '2026-08-01', date: '2025-01-01' }),
      ];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider(rows, []),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2021);

      expect(result.cashflowForecast.months[0]).toEqual({ month: '2026-08', inflow: 40, outflow: 0, net: 40 });
    });
  });

  describe('direction vs type', () => {
    it('splits income/expenses, vatByQuarter and cashflowForecast by direction, not by type', async () => {
      mockToday('2026-07-18T12:00:00.000Z');
      const rows: DashboardDocumentRow[] = [
        buildRow({
          type: 'invoice',
          direction: 'income',
          amount: 1000,
          month: 1,
          taxAmount: 210,
          status: 'pending',
          dueDate: '2026-08-10',
          date: '2026-01-05',
        }),
        buildRow({
          type: 'invoice',
          direction: 'expense',
          amount: 400,
          month: 1,
          taxAmount: 80,
          status: 'pending',
          dueDate: '2026-08-15',
          date: '2026-01-10',
        }),
      ];
      const useCase = new GetCompanyDashboardUseCase(
        new FakeDashboardDataProvider(rows, []),
        new SystemClock(),
      );

      const result = await useCase.execute(fullAccess, 2026);

      expect(result.income).toBe(1000);
      expect(result.expenses).toBe(400);
      expect(result.vatByQuarter[0]).toEqual({ quarter: 1, outputVat: 210, inputVat: 80, balance: 130 });
      expect(result.cashflowForecast.months[0]).toEqual({ month: '2026-08', inflow: 1000, outflow: 400, net: 600 });
    });
  });

  it('includes manually assigned project leasing expenses in financial totals and budgets', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const useCase = new GetCompanyDashboardUseCase(
      new FakeDashboardDataProvider(
        [buildRow({ projectId: 'project-1', amount: 1000, date: '2026-01-15', month: 1 })],
        [buildProjectDashboardRow({ budget: 1000 })],
        [{ projectId: 'project-1', amount: 250, date: '2026-03-10' }],
      ),
      new SystemClock(),
    );

    const result = await useCase.execute(fullAccess, 2026);

    expect(result.expenses).toBe(250);
    expect(result.profit).toBe(750);
    expect(result.monthlyExpenses[2]).toBe(250);
    expect(result.budgetVsActual[0]).toMatchObject({ projectId: 'project-1', expenses: 250, consumptionPct: 0.25 });
  });

  it('omits every project-linked aggregate when Projects access is denied', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const provider = new FakeDashboardDataProvider(
      [buildRow({ amount: 900, date: '2023-03-01' })],
      [buildProjectDashboardRow()],
      [{ projectId: 'project-1', amount: 250, date: '2024-03-10' }],
    );
    const findDocuments = jest.spyOn(provider, 'findAllDocumentRows');
    const findProjects = jest.spyOn(provider, 'findAllProjectRows');
    const findLeaseExpenses = jest.spyOn(provider, 'findAllLeaseExpenseRows');
    const useCase = new GetCompanyDashboardUseCase(provider, new SystemClock());

    const result = await useCase.execute({
      projects: false,
      documents: true,
      suppliers: true,
      staff: true,
      equipment: true,
    });

    expect(findDocuments).not.toHaveBeenCalled();
    expect(findProjects).not.toHaveBeenCalled();
    expect(findLeaseExpenses).not.toHaveBeenCalled();
    expect(result.availableYears).toEqual([2026]);
    expect(result.projectCount).toBe(0);
    expect(result.totalDocuments).toBe(0);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.topIssuers).toEqual([]);
    expect(result.topProjects).toEqual([]);
    expect(result.budgetVsActual).toEqual([]);
  });

  it('omits document aggregates when Documents access is denied', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const provider = new FakeDashboardDataProvider(
      [buildRow({ amount: 900 })],
      [buildProjectDashboardRow({ budget: 1000 })],
      [{ projectId: 'project-1', amount: 250, date: '2026-03-10' }],
    );
    const findDocuments = jest.spyOn(provider, 'findAllDocumentRows');
    const findLeaseExpenses = jest.spyOn(provider, 'findAllLeaseExpenseRows');
    const useCase = new GetCompanyDashboardUseCase(provider, new SystemClock());

    const result = await useCase.execute({
      projects: true,
      documents: false,
      suppliers: true,
      staff: true,
      equipment: false,
    });

    expect(findDocuments).not.toHaveBeenCalled();
    expect(findLeaseExpenses).not.toHaveBeenCalled();
    expect(result.projectCount).toBe(1);
    expect(result.totalDocuments).toBe(0);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.topIssuers).toEqual([]);
    expect(result.topProjects).toEqual([]);
    expect(result.budgetVsActual).toEqual([
      {
        projectId: 'project-1',
        name: 'Project One',
        currency: 'EUR',
        budget: 1000,
        income: 0,
        expenses: 0,
        consumptionPct: 0,
      },
    ]);
  });

  it('omits lease expense aggregates when Equipment access is denied', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const provider = new FakeDashboardDataProvider(
      [buildRow({ amount: 900 })],
      [buildProjectDashboardRow({ budget: 1000 })],
      [{ projectId: 'project-1', amount: 250, date: '2024-03-10' }],
    );
    const findLeaseExpenses = jest.spyOn(provider, 'findAllLeaseExpenseRows');
    const useCase = new GetCompanyDashboardUseCase(provider, new SystemClock());

    const result = await useCase.execute({
      projects: true,
      documents: true,
      suppliers: true,
      staff: true,
      equipment: false,
    });

    expect(findLeaseExpenses).not.toHaveBeenCalled();
    expect(result.availableYears).toEqual([2026]);
    expect(result.totalDocuments).toBe(1);
    expect(result.income).toBe(900);
    expect(result.expenses).toBe(0);
    expect(result.budgetVsActual[0]).toMatchObject({ expenses: 0, consumptionPct: 0 });
  });

  it('omits invoice and payroll metrics when their linked sections are denied', async () => {
    mockToday('2026-07-18T12:00:00.000Z');
    const provider = new FakeDashboardDataProvider(
      [
        buildRow({ type: 'invoice', amount: 900, issuerName: 'Hidden supplier', date: '2024-03-01' }),
        buildRow({ type: 'payroll', amount: 700, issuerName: 'Hidden employee', date: '2025-03-01' }),
        buildRow({ type: 'tax', amount: 100, issuerName: 'Tax authority', direction: 'expense' }),
      ],
      [buildProjectDashboardRow()],
    );
    const useCase = new GetCompanyDashboardUseCase(provider, new SystemClock());

    const result = await useCase.execute({
      projects: true,
      documents: true,
      suppliers: false,
      staff: false,
      equipment: false,
    });

    expect(result.availableYears).toEqual([2026]);
    expect(result.totalDocuments).toBe(1);
    expect(result.income).toBe(0);
    expect(result.expenses).toBe(100);
    expect(result.categoryTotals).toEqual({ invoice: 0, payroll: 0, tax: 100 });
    expect(result.topIssuers).toEqual([{ key: 'Tax authority', name: 'Tax authority', total: 100 }]);
    expect(result.topProjects).toEqual([
      { id: 'project-1', name: 'Project One', documentCount: 1, total: 100 },
    ]);
  });
});
