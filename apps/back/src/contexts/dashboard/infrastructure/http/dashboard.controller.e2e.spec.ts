import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { MemberEmail } from '../../../auth/domain/value-objects/member-email';
import { PermissionMatrix } from '../../../auth/domain/value-objects/permission-matrix';
import type { PermissionMatrixPrimitives } from '../../../auth/domain/value-objects/permission-matrix';
import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { DashboardController } from './dashboard.controller';
import { GetCompanyDashboardUseCase } from '../../application/get-company-dashboard/get-company-dashboard.use-case';
import { CompanyDashboard } from '../../domain/company-dashboard';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

type RequestWithMember = Request & { member?: WorkspaceMember };

function dashboardMember(permissionChanges: Partial<PermissionMatrixPrimitives> = {}): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('member@ledgerly.dev'),
    name: 'Member',
    role: 'member',
    permissions: PermissionMatrix.create({
      dashboard: 'view',
      projects: 'view',
      calendar: 'none',
      documents: 'view',
      suppliers: 'view',
      equipment: 'view',
      staff: 'view',
      ...permissionChanges,
    }),
    status: 'active',
    isFounder: false,
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function buildDashboard(overrides: Partial<CompanyDashboard> = {}): CompanyDashboard {
  return {
    year: 2026,
    availableYears: [2026, 2025],
    projectCount: 2,
    totalDocuments: 3,
    income: 1000,
    expenses: 400,
    profit: 600,
    margin: 0.6,
    paidCount: 1,
    pendingCount: 1,
    overdueCount: 1,
    amountByStatus: { paid: 1000, pending: 300, overdue: 100 },
    monthlyIncome: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    monthlyExpenses: [300, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    monthlyProfit: [700, -100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    cumulativeProfit: [700, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600],
    monthlyMargin: [0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    categoryTotals: { invoice: 1000, payroll: 300, tax: 100 },
    topIssuers: [{ key: 'Client A', name: 'Client A', total: 1000 }],
    topProjects: [{ id: 'p1', name: 'Project One', documentCount: 2, total: 1300 }],
    previousYear: {
      year: 2025,
      income: 800,
      expenses: 350,
      profit: 450,
      margin: 0.5625,
      totalDocuments: 4,
    },
    budgetVsActual: [
      {
        projectId: 'p1',
        name: 'Project One',
        currency: 'EUR',
        budget: 2000,
        income: 1000,
        expenses: 400,
        consumptionPct: 0.2,
      },
    ],
    vatByQuarter: [
      { quarter: 1, outputVat: 210, inputVat: 50, balance: 160 },
      { quarter: 2, outputVat: 0, inputVat: 0, balance: 0 },
      { quarter: 3, outputVat: 0, inputVat: 0, balance: 0 },
      { quarter: 4, outputVat: 0, inputVat: 0, balance: 0 },
    ],
    cashflowForecast: {
      overdue: { inflow: 500, outflow: 150, net: 350 },
      months: [
        { month: '2026-08', inflow: 300, outflow: 80, net: 220 },
        { month: '2026-09', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-10', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-11', inflow: 0, outflow: 0, net: 0 },
        { month: '2026-12', inflow: 0, outflow: 0, net: 0 },
        { month: '2027-01', inflow: 60, outflow: 0, net: 60 },
      ],
    },
    ...overrides,
  };
}

describe('DashboardController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let getExecute: jest.Mock;
  let currentMember = dashboardMember();

  beforeAll(async () => {
    getExecute = jest.fn(() => Promise.resolve(buildDashboard()));

    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: GetCompanyDashboardUseCase, useValue: { execute: getExecute } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((request: Request, _response: Response, next: NextFunction) => {
      (request as RequestWithMember).member = currentMember;
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    getExecute.mockClear();
    currentMember = dashboardMember();
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
      expect(getExecute).toHaveBeenCalledWith(
        { projects: true, documents: true, suppliers: true, staff: true, equipment: true },
        undefined,
      );
    });

    it('passes the year query param through to the use case as a number', async () => {
      const response = await request(httpServer).get('/dashboard?year=2024');

      expect(response.status).toBe(200);
      expect(getExecute).toHaveBeenCalledWith(
        { projects: true, documents: true, suppliers: true, staff: true, equipment: true },
        2024,
      );
    });

    it('passes only the allowed contributing sections to the dashboard use case', async () => {
      currentMember = dashboardMember({ projects: 'none', suppliers: 'none', staff: 'none', equipment: 'none' });

      const response = await request(httpServer).get('/dashboard');

      expect(response.status).toBe(200);
      expect(getExecute).toHaveBeenCalledWith(
        { projects: false, documents: true, suppliers: false, staff: false, equipment: false },
        undefined,
      );
    });

    it('rejects a non-integer year query param', async () => {
      const response = await request(httpServer).get('/dashboard?year=not-a-year');

      expect(response.status).toBe(400);
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
      getExecute.mockResolvedValueOnce(emptyDashboard);

      const response = await request(httpServer).get('/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(emptyDashboard);
    });
  });
});
