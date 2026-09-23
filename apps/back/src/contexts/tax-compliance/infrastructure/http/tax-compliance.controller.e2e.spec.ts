import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { TaxComplianceController } from './tax-compliance.controller';
import {
  ACCESS_REQUIREMENT_KEY,
  accessRequirementsFromMetadata,
} from '../../../../shared/infrastructure/http/access/access-requirement';
import type { AccessRequirement } from '../../../../shared/infrastructure/http/access/access-requirement';
import { GetTaxClientProfileUseCase } from '../../application/get-tax-client-profile.use-case';
import { GetTaxComplianceSettingsUseCase } from '../../application/get-tax-compliance-settings.use-case';
import { ListTaxClientProfilesUseCase } from '../../application/list-tax-client-profiles.use-case';
import { ListTaxDeadlinesUseCase } from '../../application/list-tax-deadlines.use-case';
import { ListTaxObligationCatalogUseCase } from '../../application/list-tax-obligation-catalog.use-case';
import { ListTaxSourceStatesUseCase } from '../../application/list-tax-source-states.use-case';
import { RefreshTaxSourcesUseCase } from '../../application/refresh-tax-sources.use-case';
import { ReviewTaxSourceUseCase } from '../../application/review-tax-source.use-case';
import { SaveTaxClientProfileUseCase } from '../../application/save-tax-client-profile.use-case';
import { UpdateTaxComplianceSettingsUseCase } from '../../application/update-tax-compliance-settings.use-case';
import type { TaxDeadlineView } from '../../domain/tax-deadline';
import type { TaxObligationDefinition } from '../../domain/tax-obligation-catalog';
import type { TaxSourceStateView } from '../../domain/tax-source-state';

interface RequestWithTaxCalendarMember extends Request {
  member?: {
    canAccess(module: 'projects', level: 'view'): boolean;
  };
}

function accessRequirementsFor(method: string): readonly AccessRequirement[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(TaxComplianceController.prototype, method)?.value;
  if (typeof handler !== 'function') return [];

  const metadata: unknown = Reflect.getMetadata(ACCESS_REQUIREMENT_KEY, handler);
  return accessRequirementsFromMetadata(metadata) ?? [];
}

const catalogEntry: TaxObligationDefinition = {
  key: 'es-aeat-model-303-quarterly',
  countryCode: 'ES',
  code: '303',
  category: 'vat',
  eligibleEntityTypes: ['self_employed', 'company'],
  rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 30 },
  sourceUrl: 'https://example.test/calendar',
  sourceVersion: 'AEAT-2026',
};

const deadline: TaxDeadlineView = {
  id: 'deadline-1',
  projectId: 'project-1',
  obligationKey: catalogEntry.key,
  code: catalogEntry.code,
  category: catalogEntry.category,
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  startDate: '2026-04-20',
  endDate: '2026-04-20',
  dueDate: '2026-04-20',
  status: 'pending',
  rule: catalogEntry.rule,
  sourceUrl: catalogEntry.sourceUrl,
  sourceVersion: catalogEntry.sourceVersion,
  projectName: 'Project One',
  projectCode: 'P-001',
  projectColor: '#111111',
};

const source: TaxSourceStateView = {
  sourceKey: 'es-aeat-iva',
  countryCode: 'ES',
  format: 'ical',
  sourceUrl: 'https://example.test/source',
  feedUrl: 'https://example.test/source.ics',
  status: 'current',
  acceptedHash: 'accepted-hash',
  observedHash: 'observed-hash',
  lastCheckedAt: new Date('2026-07-01T00:00:00.000Z'),
  lastSuccessfulAt: new Date('2026-07-01T00:00:00.000Z'),
  lastSourceModifiedAt: null,
  etag: 'etag',
  lastModified: null,
  lastError: null,
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  version: 'observed-hash',
  changes: [],
};

describe('TaxComplianceController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let catalogExecute: jest.Mock;
  let calendarExecute: jest.Mock;
  let sourcesExecute: jest.Mock;
  let projectsVisible: boolean;

  beforeAll(async () => {
    projectsVisible = true;
    catalogExecute = jest.fn(() => [catalogEntry]);
    calendarExecute = jest.fn((_query, access: { projects: boolean }) =>
      Promise.resolve(access.projects ? [deadline] : []),
    );
    sourcesExecute = jest.fn(() => Promise.resolve([source]));

    const moduleRef = await Test.createTestingModule({
      controllers: [TaxComplianceController],
      providers: [
        { provide: GetTaxClientProfileUseCase, useValue: {} },
        { provide: GetTaxComplianceSettingsUseCase, useValue: {} },
        { provide: ListTaxClientProfilesUseCase, useValue: {} },
        { provide: ListTaxDeadlinesUseCase, useValue: { execute: calendarExecute } },
        { provide: ListTaxObligationCatalogUseCase, useValue: { execute: catalogExecute } },
        { provide: ListTaxSourceStatesUseCase, useValue: { execute: sourcesExecute } },
        { provide: RefreshTaxSourcesUseCase, useValue: {} },
        { provide: ReviewTaxSourceUseCase, useValue: {} },
        { provide: SaveTaxClientProfileUseCase, useValue: {} },
        { provide: UpdateTaxComplianceSettingsUseCase, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((incoming: Request, _response: Response, next: NextFunction) => {
      (incoming as RequestWithTaxCalendarMember).member = {
        canAccess: () => projectsVisible,
      };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    catalogExecute.mockClear();
    calendarExecute.mockClear();
    sourcesExecute.mockClear();
    projectsVisible = true;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires calendar access before listing tax deadlines', () => {
    const requirements = accessRequirementsFor('calendar');

    expect(requirements).toEqual(
      expect.arrayContaining([
        { kind: 'access', module: 'calendar', level: 'view' },
      ]),
    );
    expect(requirements).not.toContainEqual({ kind: 'access', module: 'projects', level: 'view' });
  });

  it('keeps both tax compliance settings endpoints administrator-only', () => {
    for (const method of ['settings', 'updateSettings']) {
      expect(accessRequirementsFor(method)).toContainEqual({ kind: 'admin' });
    }
  });

  it('returns the machine-only catalog contract', async () => {
    const response = await request(httpServer).get('/tax-compliance/catalog');

    expect(response.status).toBe(200);
    const body = response.body as TaxObligationDefinition[];
    expect(body).toEqual([catalogEntry]);
    expect(Object.keys(body[0]).sort()).toEqual(
      ['category', 'code', 'countryCode', 'eligibleEntityTypes', 'key', 'rule', 'sourceUrl', 'sourceVersion'].sort(),
    );
  });

  it('returns calendar rules without display fields', async () => {
    const response = await request(httpServer)
      .get('/tax-compliance/calendar')
      .query({ from: '2026-01-01', to: '2026-12-31' });

    expect(response.status).toBe(200);
    const body = response.body as TaxDeadlineView[];
    expect(body).toEqual([deadline]);
    expect(Object.keys(body[0]).sort()).toEqual(
      [
        'category',
        'code',
        'dueDate',
        'endDate',
        'id',
        'obligationKey',
        'periodEnd',
        'periodStart',
        'projectCode',
        'projectColor',
        'projectId',
        'projectName',
        'rule',
        'sourceUrl',
        'sourceVersion',
        'startDate',
        'status',
      ].sort(),
    );
    expect(calendarExecute).toHaveBeenCalledWith(
      { from: '2026-01-01', to: '2026-12-31', projectId: undefined },
      { projects: true },
    );
    expect(catalogExecute).not.toHaveBeenCalled();
  });

  it('omits tax deadlines when projects are not visible', async () => {
    projectsVisible = false;

    const result = await app.get(TaxComplianceController).calendar(
      { from: '2026-01-01', to: '2026-12-31' },
      { canAccess: () => projectsVisible },
    );

    expect(result).toEqual([]);
    expect(calendarExecute).toHaveBeenCalledWith(
      { from: '2026-01-01', to: '2026-12-31', projectId: undefined },
      { projects: false },
    );
  });

  it('returns source state without the persisted label', async () => {
    const response = await request(httpServer).get('/tax-compliance/sources');

    expect(response.status).toBe(200);
    const body = response.body as Array<
      Omit<TaxSourceStateView, 'lastCheckedAt' | 'lastSuccessfulAt' | 'updatedAt'> & {
        lastCheckedAt: string | null;
        lastSuccessfulAt: string | null;
        updatedAt: string;
      }
    >;
    expect(body).toEqual([
      {
        ...source,
        lastCheckedAt: source.lastCheckedAt?.toISOString(),
        lastSuccessfulAt: source.lastSuccessfulAt?.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
      },
    ]);
    expect(body[0]).not.toHaveProperty('label');
  });
});
