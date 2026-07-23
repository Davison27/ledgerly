import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ScheduleController } from './schedule.controller';
import { GetScheduleBoardUseCase, ScheduleBoard } from '../../application/get-schedule-board/get-schedule-board.use-case';
import { ListScheduleEventsUseCase } from '../../application/list-schedule-events/list-schedule-events.use-case';
import { CreateScheduleEventUseCase } from '../../application/create-schedule-event/create-schedule-event.use-case';
import { CreateScheduleEventCommand } from '../../application/create-schedule-event/create-schedule-event.command';
import { UpdateScheduleEventUseCase } from '../../application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from '../../application/delete-schedule-event/delete-schedule-event.use-case';
import { ListSchedulableProjectsUseCase } from '../../application/list-schedulable-projects/list-schedulable-projects.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventView } from '../../domain/schedule-event-view';
import { ScheduleProjectView } from '../../domain/schedule-project-reader.port';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';

const PROJECT_VIEW: ScheduleProjectView = {
  id: PROJECT_ID,
  name: 'Feria de muestras',
  code: 'FM-01',
  image: null,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

function buildView(overrides: Partial<CreateScheduleEventCommand> & { id?: string } = {}): ScheduleEventView {
  const event = ScheduleEvent.create({
    id: overrides.id ?? 'event-1',
    projectId: overrides.projectId ?? PROJECT_ID,
    title: overrides.title ?? 'Montaje',
    notes: overrides.notes ?? null,
    days: (overrides.days ?? [{ date: '2026-07-03', startTime: null, endTime: null }]).map((day) => ({
      date: day.date,
      startTime: day.startTime ?? null,
      endTime: day.endTime ?? null,
    })),
    staffMemberIds: overrides.staffMemberIds ?? [],
    products: overrides.products ?? [],
  });

  return { event, project: PROJECT_VIEW, staff: [], products: [] };
}

describe('ScheduleController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let boardExecute: jest.Mock;
  let listExecute: jest.Mock;
  let createExecute: jest.Mock;
  let updateExecute: jest.Mock;
  let deleteExecute: jest.Mock;
  let schedulableProjectsExecute: jest.Mock;

  beforeAll(async () => {
    boardExecute = jest.fn(() =>
      Promise.resolve({ events: [buildView()], conflicts: [], summary: { errorCount: 0, infoCount: 0, byKind: {} } } as unknown as ScheduleBoard),
    );
    listExecute = jest.fn(() => Promise.resolve([buildView()]));
    createExecute = jest.fn((command: CreateScheduleEventCommand) => Promise.resolve(buildView(command)));
    updateExecute = jest.fn((command: { id: string } & Partial<CreateScheduleEventCommand>) =>
      Promise.resolve(buildView(command)),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    schedulableProjectsExecute = jest.fn(() => Promise.resolve([PROJECT_VIEW]));

    const moduleRef = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        { provide: GetScheduleBoardUseCase, useValue: { execute: boardExecute } },
        { provide: ListScheduleEventsUseCase, useValue: { execute: listExecute } },
        { provide: CreateScheduleEventUseCase, useValue: { execute: createExecute } },
        { provide: UpdateScheduleEventUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteScheduleEventUseCase, useValue: { execute: deleteExecute } },
        { provide: ListSchedulableProjectsUseCase, useValue: { execute: schedulableProjectsExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    boardExecute.mockClear();
    listExecute.mockClear();
    createExecute.mockClear();
    updateExecute.mockClear();
    deleteExecute.mockClear();
    schedulableProjectsExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /schedule/board', () => {
    it('returns the board for the given range', async () => {
      const response = await request(httpServer).get('/schedule/board').query({ from: '2026-07-01', to: '2026-07-31' });

      expect(response.status).toBe(200);
      expect(boardExecute).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-31' });
    });

    it('returns 400 when from is missing', async () => {
      const response = await request(httpServer).get('/schedule/board').query({ to: '2026-07-31' });

      expect(response.status).toBe(400);
      expect(boardExecute).not.toHaveBeenCalled();
    });
  });

  describe('GET /schedule/events', () => {
    it('returns the event list as plain DTOs', async () => {
      const response = await request(httpServer).get('/schedule/events');

      expect(response.status).toBe(200);
      expect(listExecute).toHaveBeenCalledTimes(1);
      const body = response.body as { id: string; startDate: string }[];
      expect(body[0].startDate).toBe('2026-07-03');
    });
  });

  describe('POST /schedule/events', () => {
    const VALID_PAYLOAD = {
      projectId: PROJECT_ID,
      title: 'Montaje',
      days: [{ date: '2026-07-03', startTime: '08:00', endTime: '14:00' }],
    };

    it('creates a schedule event and returns 201', async () => {
      const response = await request(httpServer).post('/schedule/events').send(VALID_PAYLOAD);

      expect(response.status).toBe(201);
      expect(createExecute).toHaveBeenCalledWith(expect.objectContaining({ projectId: PROJECT_ID }));
    });

    it('returns 400 when a day has a malformed date', async () => {
      const response = await request(httpServer)
        .post('/schedule/events')
        .send({ ...VALID_PAYLOAD, days: [{ date: '03-07-2026' }] });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when days is empty', async () => {
      const response = await request(httpServer).post('/schedule/events').send({ ...VALID_PAYLOAD, days: [] });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 404 when the project does not exist', async () => {
      createExecute.mockRejectedValueOnce(new ScheduleProjectNotFoundException(PROJECT_ID));

      const response = await request(httpServer).post('/schedule/events').send(VALID_PAYLOAD);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /schedule/events/:id', () => {
    it('updates the event', async () => {
      const response = await request(httpServer).patch('/schedule/events/event-1').send({ title: 'Evento' });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1', title: 'Evento' }));
    });

    it('returns 404 when the event is not found', async () => {
      updateExecute.mockRejectedValueOnce(new ScheduleEventNotFoundException('missing-event'));

      const response = await request(httpServer).patch('/schedule/events/missing-event').send({ title: 'Evento' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /schedule/events/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/schedule/events/event-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('event-1');
    });
  });

  describe('GET /schedule/schedulable-projects', () => {
    it('returns the active projects', async () => {
      const response = await request(httpServer).get('/schedule/schedulable-projects');

      expect(response.status).toBe(200);
      expect(schedulableProjectsExecute).toHaveBeenCalledTimes(1);
      const body = response.body as { id: string }[];
      expect(body[0].id).toBe(PROJECT_ID);
    });
  });
});
