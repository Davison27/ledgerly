import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DashboardController } from './dashboard.controller';
import { GetCompanyDashboardUseCase } from '../../application/get-company-dashboard/get-company-dashboard.use-case';
import { CompanyDashboard } from '../../domain/company-dashboard';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildDashboard(overrides: Partial<CompanyDashboard> = {}): CompanyDashboard {
  return {
    projectCount: 2,
    totalDocuments: 3,
    income: 1000,
    expenses: 400,
    profit: 600,
    margin: 0.6,
    paidCount: 1,
    pendingCount: 1,
    overdueCount: 1,
    amountByStatus: { pagado: 1000, pendiente: 300, vencido: 100 },
    monthlyIncome: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    monthlyExpenses: [300, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    monthlyProfit: [700, -100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    cumulativeProfit: [700, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600],
    monthlyMargin: [0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    categoryTotals: { factura: 1000, nomina: 300, impuesto: 100 },
    topIssuers: [{ key: 'Client A', name: 'Client A', total: 1000 }],
    topProjects: [{ id: 'p1', name: 'Project One', documentCount: 2, total: 1300 }],
    ...overrides,
  };
}

describe('DashboardController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let getExecute: jest.Mock;

  beforeAll(async () => {
    getExecute = jest.fn(() => Promise.resolve(buildDashboard()));

    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: GetCompanyDashboardUseCase, useValue: { execute: getExecute } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    getExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /dashboard', () => {
    it('returns the full company dashboard contract shape', async () => {
      const response = await request(httpServer).get('/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(buildDashboard());
      expect(getExecute).toHaveBeenCalledTimes(1);
    });

    it('returns all-zero data when there are no documents', async () => {
      const emptyDashboard = buildDashboard({
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
      getExecute.mockResolvedValueOnce(emptyDashboard);

      const response = await request(httpServer).get('/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(emptyDashboard);
    });
  });
});
