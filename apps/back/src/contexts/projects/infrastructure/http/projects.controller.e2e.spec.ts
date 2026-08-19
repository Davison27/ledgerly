import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProjectsController } from './projects.controller';
import { ListProjectsUseCase } from '../../application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from '../../application/get-project/get-project.use-case';
import { CreateProjectUseCase } from '../../application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from '../../application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from '../../application/delete-project/delete-project.use-case';
import { CreateProjectCommand } from '../../application/create-project/create-project.command';
import { Project, ProjectPrimitives } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildProject(
  overrides: Partial<CreateProjectCommand> & { id?: string } = {},
): Project {
  const params: ProjectPrimitives = {
    id: overrides.id ?? 'project-1',
    name: overrides.name ?? 'Acme Project',
    code: overrides.code ?? 'ACME-001',
    type: overrides.type ?? 'construction',
    status: overrides.status ?? 'active',
    description: overrides.description ?? null,
    clientCompany: overrides.clientCompany ?? null,
    clientTaxId: overrides.clientTaxId ?? null,
    contactName: overrides.contactName ?? null,
    contactEmail: overrides.contactEmail ?? null,
    contactPhone: overrides.contactPhone ?? null,
    address: overrides.address ?? null,
    startDate: overrides.startDate ?? null,
    endDate: overrides.endDate ?? null,
    budget: overrides.budget ?? null,
    currency: overrides.currency ?? 'EUR',
    fiscalYear: overrides.fiscalYear ?? null,
    manager: overrides.manager ?? null,
    image: overrides.image ?? null,
    color: overrides.color ?? null,
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

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildSummary()]));
    getExecute = jest.fn((id: string) => Promise.resolve(buildProject({ id })));
    createExecute = jest.fn((command: CreateProjectCommand) =>
      Promise.resolve(buildProject(command)),
    );
    updateExecute = jest.fn((command: { id: string } & Partial<CreateProjectCommand>) =>
      Promise.resolve(buildProject(command)),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ListProjectsUseCase, useValue: { execute: listExecute } },
        { provide: GetProjectUseCase, useValue: { execute: getExecute } },
        { provide: CreateProjectUseCase, useValue: { execute: createExecute } },
        { provide: UpdateProjectUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteProjectUseCase, useValue: { execute: deleteExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /projects', () => {
    it('returns the project summaries including image', async () => {
      listExecute.mockResolvedValueOnce([buildSummary({ image: 'data:image/png;base64,abc' })]);

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
          image: 'data:image/png;base64,abc',
          color: null,
          isDemo: false,
        },
      ]);
    });

    it('returns the color assigned to the project', async () => {
      listExecute.mockResolvedValueOnce([buildSummary({ color: 'terracotta' })]);

      const response = await request(httpServer).get('/projects');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([{ color: 'terracotta' }]);
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
          image: 'data:image/png;base64,abc',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Acme Project',
        code: 'ACME-001',
        image: 'data:image/png;base64,abc',
      });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ image: 'data:image/png;base64,abc' }),
      );
    });
  });

  describe('GET /projects/:id', () => {
    it('returns the full project (not the summary shape)', async () => {
      getExecute.mockResolvedValueOnce(
        buildProject({ id: 'project-1', image: 'data:image/png;base64,abc' }),
      );

      const response = await request(httpServer).get('/projects/project-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'project-1',
        name: 'Acme Project',
        code: 'ACME-001',
        type: 'construction',
        status: 'active',
        image: 'data:image/png;base64,abc',
      });
      expect(response.body).not.toHaveProperty('documentCount');
      expect(response.body).not.toHaveProperty('pendingCount');
      expect(getExecute).toHaveBeenCalledWith('project-1');
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
        .send({ image: 'data:image/png;base64,def' });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'project-1', image: 'data:image/png;base64,def' }),
      );
      expect(response.body).toMatchObject({ image: 'data:image/png;base64,def' });
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
  });

  describe('DELETE /projects/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/projects/project-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('project-1');
    });
  });
});
