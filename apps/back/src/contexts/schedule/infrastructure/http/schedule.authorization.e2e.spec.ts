import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn(() => new Headers()) }));

import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { MemberEmail } from '../../../auth/domain/value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from '../../../auth/domain/value-objects/permission-matrix';
import { WORKSPACE_MEMBER_REPOSITORY } from '../../../auth/domain/workspace-member.repository';
import { AUTH_SESSION_RESOLVER } from '../../../../shared/domain/auth-session-resolver.port';
import { CLOCK } from '../../../../shared/domain/clock.port';
import { AccessGuard } from '../../../../shared/infrastructure/http/access/access.guard';
import { ProjectsController } from '../../../projects/infrastructure/http/projects.controller';
import { CLIENT_REPOSITORY } from '../../../projects/domain/client.repository';
import { PROJECT_REPOSITORY } from '../../../projects/domain/project.repository';
import { ListProjectsUseCase } from '../../../projects/application/list-projects/list-projects.use-case';
import { GetProjectUseCase } from '../../../projects/application/get-project/get-project.use-case';
import { CreateProjectUseCase } from '../../../projects/application/create-project/create-project.use-case';
import { UpdateProjectUseCase } from '../../../projects/application/update-project/update-project.use-case';
import { DeleteProjectUseCase } from '../../../projects/application/delete-project/delete-project.use-case';
import { UnarchiveProjectUseCase } from '../../../projects/application/unarchive-project/unarchive-project.use-case';
import { StaffController } from '../../../staff/infrastructure/http/staff.controller';
import { ListStaffMembersUseCase } from '../../../staff/application/list-staff-members/list-staff-members.use-case';
import { GetStaffMemberUseCase } from '../../../staff/application/get-staff-member/get-staff-member.use-case';
import { CreateStaffMemberUseCase } from '../../../staff/application/create-staff-member/create-staff-member.use-case';
import { UpdateStaffMemberUseCase } from '../../../staff/application/update-staff-member/update-staff-member.use-case';
import { DeleteStaffMemberUseCase } from '../../../staff/application/delete-staff-member/delete-staff-member.use-case';
import { UnarchiveStaffMemberUseCase } from '../../../staff/application/unarchive-staff-member/unarchive-staff-member.use-case';
import { EquipmentController } from '../../../equipment/infrastructure/http/equipment.controller';
import { ListEquipmentUseCase } from '../../../equipment/application/list-equipment/list-equipment.use-case';
import { CreateEquipmentUseCase } from '../../../equipment/application/create-equipment/create-equipment.use-case';
import { UpdateEquipmentUseCase } from '../../../equipment/application/update-equipment/update-equipment.use-case';
import { DeleteEquipmentUseCase } from '../../../equipment/application/delete-equipment/delete-equipment.use-case';
import { UnarchiveEquipmentUseCase } from '../../../equipment/application/unarchive-equipment/unarchive-equipment.use-case';
import { ScheduleController } from './schedule.controller';
import { GetScheduleBoardUseCase } from '../../application/get-schedule-board/get-schedule-board.use-case';
import { ListScheduleEventsUseCase } from '../../application/list-schedule-events/list-schedule-events.use-case';
import { CreateScheduleEventUseCase } from '../../application/create-schedule-event/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from '../../application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from '../../application/delete-schedule-event/delete-schedule-event.use-case';
import { ListSchedulableProjectsUseCase } from '../../application/list-schedulable-projects/list-schedulable-projects.use-case';
import { GetCalendarEditorBoardUseCase } from '../../application/get-calendar-editor-board/get-calendar-editor-board.use-case';
import { ListCalendarEditorProjectsUseCase } from '../../application/list-calendar-editor-projects/list-calendar-editor-projects.use-case';
import { ListCalendarEditorStaffUseCase } from '../../application/list-calendar-editor-staff/list-calendar-editor-staff.use-case';
import { ListCalendarEditorEquipmentUseCase } from '../../application/list-calendar-editor-equipment/list-calendar-editor-equipment.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventView } from '../../domain/schedule-event-view';
import { ScheduleProjectView } from '../../domain/schedule-project-reader.port';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_EMAIL = 'member@ledgerly.dev';
const session = {
  user: { email: MEMBER_EMAIL },
  session: { createdAt: new Date('2026-01-02T00:00:00.000Z'), token: 'session-token' },
};
const project: ScheduleProjectView = {
  id: PROJECT_ID,
  name: 'Project',
  code: 'PROJECT-001',
  image: null,
  status: 'active',
  startDate: null,
  endDate: null,
  color: null,
};
const event = ScheduleEvent.create({
  id: 'event-1',
  projectId: PROJECT_ID,
  title: 'Setup',
  days: [{ date: '2026-07-03', startTime: '08:00', endTime: '14:00' }],
});
const eventView: ScheduleEventView = { event, project, staff: [], equipment: [] };
const editorEvent = {
  id: event.id,
  title: event.title,
  notes: event.notes,
  startDate: event.startDate,
  endDate: event.endDate,
  projectId: event.projectId,
  days: event.days.map((day) => day.toPrimitives()),
  project: { id: PROJECT_ID, displayName: 'Project' },
  staff: [],
  equipment: [],
};

function member(
  levels: Partial<Record<(typeof WORKSPACE_MODULES)[number], 'none' | 'view' | 'edit'>>,
): WorkspaceMember {
  const permissions = WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
    matrix[module] = levels[module] ?? 'none';
    return matrix;
  }, {});

  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create(MEMBER_EMAIL),
    name: 'Member',
    role: 'member',
    permissions: PermissionMatrix.create(permissions),
    status: 'active',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('schedule authorization HTTP integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  let currentMember = member({});
  const sessionResolver = { resolve: jest.fn() };
  const memberRepository = { findByEmail: jest.fn(), save: jest.fn() };
  const scheduleExecutions = {
    board: jest.fn(() => Promise.resolve({ events: [eventView], conflicts: [], summary: { errorCount: 0, infoCount: 0, byKind: {} } })),
    events: jest.fn(() => Promise.resolve([eventView])),
    create: jest.fn(() => Promise.resolve(eventView)),
    update: jest.fn(() => Promise.resolve(eventView)),
    delete: jest.fn(() => Promise.resolve(true)),
    schedulableProjects: jest.fn(() => Promise.resolve([])),
    editorBoard: jest.fn(() => Promise.resolve([editorEvent])),
    editorProjects: jest.fn(() => Promise.resolve([{ id: PROJECT_ID, displayName: 'Project' }])),
    editorStaff: jest.fn(() => Promise.resolve([{ id: 'staff-1', displayName: 'Ana García' }])),
    editorEquipment: jest.fn(() => Promise.resolve([{ id: 'equipment-1', displayName: 'Canopy' }])),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ScheduleController, ProjectsController, StaffController, EquipmentController],
      providers: [
        { provide: GetScheduleBoardUseCase, useValue: { execute: scheduleExecutions.board } },
        { provide: ListScheduleEventsUseCase, useValue: { execute: scheduleExecutions.events } },
        { provide: CreateScheduleEventUseCase, useValue: { execute: scheduleExecutions.create } },
        { provide: UpdateScheduleEventUseCase, useValue: { execute: scheduleExecutions.update } },
        { provide: DeleteScheduleEventUseCase, useValue: { execute: scheduleExecutions.delete } },
        { provide: ListSchedulableProjectsUseCase, useValue: { execute: scheduleExecutions.schedulableProjects } },
        { provide: GetCalendarEditorBoardUseCase, useValue: { execute: scheduleExecutions.editorBoard } },
        { provide: ListCalendarEditorProjectsUseCase, useValue: { execute: scheduleExecutions.editorProjects } },
        { provide: ListCalendarEditorStaffUseCase, useValue: { execute: scheduleExecutions.editorStaff } },
        { provide: ListCalendarEditorEquipmentUseCase, useValue: { execute: scheduleExecutions.editorEquipment } },
        { provide: ListProjectsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetProjectUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateProjectUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProjectUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteProjectUseCase, useValue: { execute: jest.fn() } },
        { provide: UnarchiveProjectUseCase, useValue: { execute: jest.fn() } },
        { provide: CLIENT_REPOSITORY, useValue: { findById: jest.fn() } },
        { provide: PROJECT_REPOSITORY, useValue: { findSummaryById: jest.fn() } },
        { provide: ListStaffMembersUseCase, useValue: { execute: jest.fn() } },
        { provide: GetStaffMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateStaffMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateStaffMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteStaffMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: UnarchiveStaffMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: ListEquipmentUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateEquipmentUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateEquipmentUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteEquipmentUseCase, useValue: { execute: jest.fn() } },
        { provide: UnarchiveEquipmentUseCase, useValue: { execute: jest.fn() } },
        { provide: WORKSPACE_MEMBER_REPOSITORY, useValue: memberRepository },
        { provide: AUTH_SESSION_RESOLVER, useValue: sessionResolver },
        { provide: CLOCK, useValue: { now: () => new Date('2026-01-02T00:00:00.000Z'), todayIso: () => '2026-01-02' } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalGuards(new AccessGuard(new Reflector(), memberRepository as never, sessionResolver, {
      now: () => new Date('2026-01-02T00:00:00.000Z'),
      todayIso: () => '2026-01-02',
    }));
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    currentMember = member({ calendar: 'edit' });
    sessionResolver.resolve.mockReset().mockResolvedValue({ session, setCookies: [] });
    memberRepository.findByEmail.mockReset().mockImplementation(() => Promise.resolve(currentMember));
    Object.values(scheduleExecutions).forEach((execute) => execute.mockClear());
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows calendar editors to use the editor projections and schedule mutations with no linked section grants', async () => {
    const createPayload = {
      projectId: PROJECT_ID,
      title: 'Setup',
      days: [{ date: '2026-07-03', startTime: '08:00', endTime: '14:00' }],
    };
    const responses = [
      await request(httpServer).get('/schedule/editor/board').query({ from: '2026-07-01', to: '2026-07-31' }),
      await request(httpServer).get('/schedule/editor/projects'),
      await request(httpServer).get('/schedule/editor/staff'),
      await request(httpServer).get('/schedule/editor/equipment'),
      await request(httpServer).post('/schedule/events').send(createPayload),
      await request(httpServer).patch('/schedule/events/event-1').send({ title: 'Updated' }),
      await request(httpServer).delete('/schedule/events/event-1'),
    ];

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200, 200, 201, 200, 204]);
    expect(responses[0].body).toEqual([editorEvent]);
    expect(responses[1].body).toEqual([{ id: PROJECT_ID, displayName: 'Project' }]);
    expect(responses[2].body).toEqual([{ id: 'staff-1', displayName: 'Ana García' }]);
    expect(responses[3].body).toEqual([{ id: 'equipment-1', displayName: 'Canopy' }]);
    expect(responses[4].body).toEqual({ id: 'event-1' });
    expect(responses[5].body).toEqual({ id: 'event-1' });
    expect(scheduleExecutions.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: PROJECT_ID }), {
      calendar: 'edit',
    });
    expect(scheduleExecutions.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1' }), {
      calendar: 'edit',
    });
    expect(scheduleExecutions.delete).toHaveBeenCalledWith('event-1', { calendar: 'edit' });
  });

  it('denies calendar editor routes to members with calendar view access only', async () => {
    currentMember = member({ calendar: 'view' });
    const responses = [
      await request(httpServer).get('/schedule/editor/board').query({ from: '2026-07-01', to: '2026-07-31' }),
      await request(httpServer).get('/schedule/editor/projects'),
      await request(httpServer).get('/schedule/editor/staff'),
      await request(httpServer).get('/schedule/editor/equipment'),
      await request(httpServer).post('/schedule/events').send({
        projectId: PROJECT_ID,
        title: 'Setup',
        days: [{ date: '2026-07-03' }],
      }),
    ];

    expect(responses.map(({ status }) => status)).toEqual([403, 403, 403, 403, 403]);
    expect(scheduleExecutions.editorBoard).not.toHaveBeenCalled();
    expect(scheduleExecutions.create).not.toHaveBeenCalled();
  });

  it('denies section reads and direct writes without their own grants', async () => {
    const responses = [
      await request(httpServer).get('/projects'),
      await request(httpServer).get(`/projects/${PROJECT_ID}`),
      await request(httpServer).get('/staff'),
      await request(httpServer).get('/staff/staff-1'),
      await request(httpServer).get('/equipment'),
      await request(httpServer).post('/projects').send({}),
      await request(httpServer).patch(`/projects/${PROJECT_ID}`).send({}),
      await request(httpServer).delete(`/projects/${PROJECT_ID}`),
      await request(httpServer).post('/staff').send({}),
      await request(httpServer).patch('/staff/staff-1').send({}),
      await request(httpServer).delete('/staff/staff-1'),
      await request(httpServer).post('/equipment').send({}),
      await request(httpServer).patch('/equipment/equipment-1').send({}),
      await request(httpServer).delete('/equipment/equipment-1'),
    ];

    expect(responses.map(({ status }) => status)).toEqual(Array.from({ length: 14 }, () => 403));
  });

  it('keeps full schedule reads behind Calendar.view and Projects.view and passes linked visibility grants', async () => {
    currentMember = member({ calendar: 'view', projects: 'view' });
    const responses = [
      await request(httpServer).get('/schedule/board').query({ from: '2026-07-01', to: '2026-07-31' }),
      await request(httpServer).get('/schedule/events'),
      await request(httpServer).get('/schedule/schedulable-projects'),
    ];

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(scheduleExecutions.board).toHaveBeenCalledWith(
      { from: '2026-07-01', to: '2026-07-31' },
      { projects: 'view', staff: 'none', equipment: 'none' },
    );
    expect(scheduleExecutions.events).toHaveBeenCalledWith(
      { from: undefined, to: undefined, projectId: undefined, staffMemberId: undefined },
      { projects: 'view', staff: 'none', equipment: 'none' },
    );
    expect(scheduleExecutions.schedulableProjects).toHaveBeenCalledWith({
      projects: 'view',
      staff: 'none',
      equipment: 'none',
    });
  });
});
