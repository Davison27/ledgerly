import type { Server } from 'http';
import type { NextFunction, Request, Response } from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProjectsController } from './projects.controller';
import { ListProjectsUseCase } from '../../application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from '../../application/get-project/get-project.use-case';
import { CreateProjectUseCase } from '../../application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from '../../application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from '../../application/delete-project/delete-project.use-case';
import { UnarchiveProjectUseCase } from '../../application/unarchive-project/unarchive-project.use-case';
import { CreateProjectCommand } from '../../application/create-project/create-project.command';
import { Project, ProjectPrimitives } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { CLIENT_REPOSITORY } from '../../domain/client.repository';
import { PROJECT_REPOSITORY } from '../../domain/project.repository';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';

const image = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;
const clientId = '00000000-0000-4000-8000-000000000001';

function buildProject(
  overrides: Partial<CreateProjectCommand> & { id?: string; planningEnabled?: boolean } = {},
): Project {
  const params: ProjectPrimitives = {
    id: overrides.id ?? 'project-1',
    name: overrides.name ?? 'Acme Project',
    code: overrides.code ?? 'ACME-001',
    type: overrides.type ?? 'construction',
    status: overrides.status ?? 'active',
    description: overrides.description ?? null,
    clientId: overrides.clientId ?? clientId,
    address: overrides.address ?? null,
    startDate: overrides.startDate ?? null,
    endDate: overrides.endDate ?? null,
    budget: overrides.budget ?? null,
    currency: overrides.currency ?? 'EUR',
    manager: overrides.manager ?? null,
    image: overrides.image ?? null,
    color: overrides.color ?? null,
    planningEnabled: overrides.planningEnabled ?? false,
  };

  return Project.create(params);
}

function buildSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: overrides.id ?? 'project-1',
    name: overrides.name ?? 'Acme Project',
    code: overrides.code ?? 'ACME-001',
    currency: overrides.currency ?? 'EUR',
    financials: overrides.financials ?? [],
    documentCount: overrides.documentCount ?? 0,
    pendingCount: overrides.pendingCount ?? 0,
    planningEnabled: overrides.planningEnabled ?? false,
    checklistAssigned: overrides.checklistAssigned,
    checklistCompletedCount: overrides.checklistCompletedCount ?? 0,
    checklistTotalCount: overrides.checklistTotalCount ?? 0,
    image: overrides.image ?? null,
    color: overrides.color ?? null,
  };
}

describe('ProjectsController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let getExecute: jest.Mock;
  let createExecute: jest.Mock;
  let updateExecute: jest.Mock;
  let deleteExecute: jest.Mock;
  let unarchiveExecute: jest.Mock;
  let documentViewAccess = true;
  let equipmentViewAccess = true;
  let planningViewAccess = true;
  let planningEditAccess = true;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildSummary()]));
    getExecute = jest.fn((id: string) => Promise.resolve(buildProject({ id })));
    createExecute = jest.fn((command: CreateProjectCommand) =>
      Promise.resolve(buildProject(command)),
    );
    updateExecute = jest.fn((command: { id: string } & Partial<CreateProjectCommand>) =>
      Promise.resolve(buildProject(command)),
    );
    deleteExecute = jest.fn<Promise<'deleted' | 'archived'>, [string]>().mockResolvedValue('deleted');
    unarchiveExecute = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ListProjectsUseCase, useValue: { execute: listExecute } },
        { provide: GetProjectUseCase, useValue: { execute: getExecute } },
        { provide: CreateProjectUseCase, useValue: { execute: createExecute } },
        { provide: UpdateProjectUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteProjectUseCase, useValue: { execute: deleteExecute } },
        { provide: UnarchiveProjectUseCase, useValue: { execute: unarchiveExecute } },
        { provide: CLIENT_REPOSITORY, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: PROJECT_REPOSITORY, useValue: { findSummaryById: jest.fn().mockImplementation((id: string) => Promise.resolve(buildSummary({ id, planningEnabled: true }))) } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((request: Request, _response: Response, next: NextFunction) => {
      Object.assign(request, {
        member: {
          canAccess: (module: string, level: string) => {
            if (module === 'documents') return documentViewAccess;
            if (module === 'equipment') return equipmentViewAccess;
            if (module === 'planning' && level === 'view') return planningViewAccess;
            if (module === 'planning' && level === 'edit') return planningEditAccess;
            return true;
          },
        },
      });
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    listExecute.mockClear();
    getExecute.mockClear();
    createExecute.mockClear();
    updateExecute.mockClear();
    deleteExecute.mockClear();
    unarchiveExecute.mockClear();
    documentViewAccess = true;
    equipmentViewAccess = true;
    planningViewAccess = true;
    planningEditAccess = true;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /projects', () => {
    it('returns the project summaries including image', async () => {
      listExecute.mockResolvedValueOnce([buildSummary({ image })]);

      const response = await request(httpServer).get('/projects');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'project-1',
          name: 'Acme Project',
          code: 'ACME-001',
          currency: 'EUR',
          financials: [],
          documentCount: 0,
          pendingCount: 0,
          image,
          color: null,
        },
      ]);
    });

    it('omits document-derived aggregates without Documents view', async () => {
      documentViewAccess = false;
      listExecute.mockResolvedValueOnce([
        buildSummary({
          documentCount: 4,
          pendingCount: 2,
          financials: [
            { currency: 'EUR', income: 1000, expenses: 300, profit: 700, margin: 0.7 },
          ],
        }),
      ]);

      const response = await request(httpServer).get('/projects');

      expect(response.status).toBe(200);
      const body = response.body as Array<Record<string, unknown>>;
      expect(body[0]).toMatchObject({ id: 'project-1', name: 'Acme Project' });
      expect(body[0]).not.toHaveProperty('documentCount');
      expect(body[0]).not.toHaveProperty('pendingCount');
      expect(body[0]).not.toHaveProperty('financials');
    });

    it('omits financials without Equipment view while keeping document counts', async () => {
      equipmentViewAccess = false;
      listExecute.mockResolvedValueOnce([
        buildSummary({
          documentCount: 4,
          pendingCount: 2,
          financials: [
            { currency: 'EUR', income: 1000, expenses: 300, profit: 700, margin: 0.7 },
          ],
        }),
      ]);

      const response = await request(httpServer).get('/projects');

      expect(response.status).toBe(200);
      const body = response.body as Array<Record<string, unknown>>;
      expect(body[0]).toMatchObject({ documentCount: 4, pendingCount: 2 });
      expect(body[0]).not.toHaveProperty('financials');
    });

    it('returns the color assigned to the project', async () => {
      listExecute.mockResolvedValueOnce([buildSummary({ color: 'terracotta' })]);

      const response = await request(httpServer).get('/projects');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([{ color: 'terracotta' }]);
    });

    it('returns planning counts only when enabled and the member can view planning', async () => {
      listExecute.mockResolvedValueOnce([buildSummary({
        planningEnabled: true,
        checklistCompletedCount: 2,
        checklistTotalCount: 5,
      })]);
      const allowed = await request(httpServer).get('/projects');
      const allowedBody = allowed.body as unknown as Array<Record<string, unknown>>;
      expect(allowedBody[0]).toMatchObject({ checklistCompletedCount: 2, checklistTotalCount: 5 });

      planningViewAccess = false;
      listExecute.mockResolvedValueOnce([buildSummary({
        planningEnabled: true,
        checklistCompletedCount: 2,
        checklistTotalCount: 5,
      })]);
      const denied = await request(httpServer).get('/projects');
      const deniedBody = denied.body as unknown as Array<Record<string, unknown>>;
      expect(deniedBody[0]).not.toHaveProperty('checklistCompletedCount');
      expect(deniedBody[0]).not.toHaveProperty('checklistTotalCount');
    });

    it('passes the optional client filter to the list use case', async () => {
      const response = await request(httpServer).get(`/projects?clientId=${clientId}`);

      expect(response.status).toBe(200);
      expect(listExecute).toHaveBeenCalledWith(clientId);
    });

    it('rejects malformed client filters', async () => {
      const response = await request(httpServer).get('/projects?clientId=not-a-uuid');

      expect(response.status).toBe(400);
      expect(listExecute).not.toHaveBeenCalled();
    });
  });

  describe('POST /projects', () => {
    it('creates a project with an image and returns it in the full response', async () => {
      const response = await request(httpServer)
        .post('/projects')
        .send({
          name: 'Acme Project',
          code: 'ACME-001',
          type: 'construction',
          clientId,
          image,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Acme Project',
        code: 'ACME-001',
        image,
      });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ image, clientId }),
      );
    });

    it('rejects project creation without a client', async () => {
      const response = await request(httpServer)
        .post('/projects')
        .send({ name: 'Acme Project', code: 'ACME-002', type: 'construction' });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('rejects malformed project client identifiers', async () => {
      const response = await request(httpServer)
        .post('/projects')
        .send({ name: 'Acme Project', code: 'ACME-003', type: 'construction', clientId: 'client-1' });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('requires planning edit to assign a checklist template', async () => {
      planningEditAccess = false;
      const response = await request(httpServer)
        .post('/projects')
        .send({
          name: 'Planned Project',
          code: 'PLAN-001',
          type: 'construction',
          clientId,
          checklistTemplateId: '00000000-0000-4000-8000-000000000002',
        });

      expect(response.status).toBe(403);
      expect(createExecute).not.toHaveBeenCalled();
    });
  });

  describe('GET /projects/:id', () => {
    it('returns the full project (not the summary shape)', async () => {
      getExecute.mockResolvedValueOnce(
        buildProject({ id: 'project-1', image }),
      );

      const response = await request(httpServer).get('/projects/project-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'project-1',
        name: 'Acme Project',
        code: 'ACME-001',
        type: 'construction',
        status: 'active',
        clientId,
        image,
      });
      expect(response.body).not.toHaveProperty('documentCount');
      expect(response.body).not.toHaveProperty('pendingCount');
      expect(getExecute).toHaveBeenCalledWith('project-1');
    });

    it('includes checklist counts for planning viewers only when the project is enabled', async () => {
      getExecute.mockResolvedValueOnce(buildProject({ id: 'project-1', planningEnabled: true }));
      const allowed = await request(httpServer).get('/projects/project-1');
      expect(allowed.body).toMatchObject({ checklistCompletedCount: 0, checklistTotalCount: 0 });

      planningViewAccess = false;
      getExecute.mockResolvedValueOnce(buildProject({ id: 'project-1', planningEnabled: true }));
      const denied = await request(httpServer).get('/projects/project-1');
      expect(denied.body).not.toHaveProperty('checklistCompletedCount');
      expect(denied.body).not.toHaveProperty('checklistTotalCount');

      planningViewAccess = true;
      getExecute.mockResolvedValueOnce(buildProject({ id: 'project-1', planningEnabled: false }));
      const disabled = await request(httpServer).get('/projects/project-1');
      expect(disabled.body).not.toHaveProperty('checklistCompletedCount');
      expect(disabled.body).not.toHaveProperty('checklistTotalCount');
    });

    it('returns 404 when the project is not found', async () => {
      getExecute.mockRejectedValueOnce(new ProjectNotFoundException('missing-id'));

      const response = await request(httpServer).get('/projects/missing-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('updates the project image', async () => {
      const response = await request(httpServer)
        .patch('/projects/project-1')
        .send({ image });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'project-1', image }),
      );
      expect(response.body).toMatchObject({ image });
    });

    it('clears the project image when the request explicitly sends null', async () => {
      const response = await request(httpServer)
        .patch('/projects/project-1')
        .send({ image: null });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'project-1', image: null }),
      );
      expect(response.body).toMatchObject({ image: null });
    });

    it('rejects an explicit null client identifier', async () => {
      updateExecute.mockRejectedValueOnce(new InvalidValueException('clientId cannot be null'));
      const response = await request(httpServer)
        .patch('/projects/project-1')
        .send({ clientId: null });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_VALUE' });
      expect(updateExecute).toHaveBeenCalledWith(expect.objectContaining({ clientId: null }));
    });
  });

  describe('DELETE /projects/:id', () => {
    it('returns the deletion outcome and forwards the id', async () => {
      const response = await request(httpServer).delete('/projects/project-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ outcome: 'deleted' });
      expect(deleteExecute).toHaveBeenCalledWith('project-1');
    });
  });

  describe('POST /projects/:id/unarchive', () => {
    it('returns the unarchive outcome and forwards the id', async () => {
      const response = await request(httpServer).post('/projects/project-1/unarchive');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ outcome: 'unarchived' });
      expect(unarchiveExecute).toHaveBeenCalledWith('project-1');
    });
  });
});
