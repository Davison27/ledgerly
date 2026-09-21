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
import { UnarchiveProjectUseCase } from '../../application/unarchive-project/unarchive-project.use-case';
import { CreateProjectCommand } from '../../application/create-project/create-project.command';
import { Project, ProjectPrimitives } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { CLIENT_REPOSITORY } from '../../domain/client.repository';

const image = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

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
    clientId: overrides.clientId ?? null,
    address: overrides.address ?? null,
    startDate: overrides.startDate ?? null,
    endDate: overrides.endDate ?? null,
    budget: overrides.budget ?? null,
    currency: overrides.currency ?? 'EUR',
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
  let unarchiveExecute: jest.Mock;

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
    unarchiveExecute.mockClear();
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
          image,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Acme Project',
        code: 'ACME-001',
        image,
      });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ image }),
      );
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
        image,
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
