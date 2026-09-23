import type { Server } from 'http';
import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { ListNotificationsUseCase } from '../../application/list-notifications/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/count-unread-notifications/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/mark-notification-read/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { ResolveNotificationUseCase } from '../../application/resolve-notification/resolve-notification.use-case';
import { NotificationsPage } from '../../application/list-notifications/notifications-page';
import { NotificationNotFoundException } from '../../domain/errors/notification-not-found.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { MemberEmail } from '../../../auth/domain/value-objects/member-email';
import { PermissionMatrix } from '../../../auth/domain/value-objects/permission-matrix';
import { NotificationAccessSnapshot } from '../../domain/notification-access';

const ACCESS: NotificationAccessSnapshot = {
  projects: 'view',
  calendar: 'view',
  documents: 'view',
  staff: 'none',
  equipment: 'none',
};

function activeMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('member@ledgerly.dev'),
    name: 'Member',
    role: 'member',
    permissions: PermissionMatrix.create({
      dashboard: 'view',
      projects: ACCESS.projects,
      calendar: ACCESS.calendar,
      documents: ACCESS.documents,
      suppliers: 'none',
      equipment: ACCESS.equipment,
      staff: ACCESS.staff,
    }),
    status: 'active',
    invitedAt: new Date('2026-09-01T00:00:00.000Z'),
  });
}

function buildPage(overrides: Partial<NotificationsPage> = {}): NotificationsPage {
  return {
    items: [
      {
        id: 'notification-1',
        type: 'document_overdue',
        severity: 'error',
        subject: 'Acme SL - INV-1024',
        related: null,
        date: '2026-07-01',
        amount: 1210.55,
        conflictKind: null,
        resourceKind: 'document',
        resourceId: 'doc-1',
        resourceProjectId: 'project-1',
        createdAt: new Date('2026-07-27T05:00:00.000Z'),
        readAt: null,
        resolvedAt: null,
      },
    ],
    total: 37,
    page: 1,
    size: 20,
    unreadCount: 12,
    ...overrides,
  };
}

describe('NotificationsController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let unreadCountExecute: jest.Mock;
  let markReadExecute: jest.Mock;
  let markAllReadExecute: jest.Mock;
  let resolveExecute: jest.Mock;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve(buildPage()));
    unreadCountExecute = jest.fn(() => Promise.resolve(12));
    markReadExecute = jest.fn(() => Promise.resolve(undefined));
    markAllReadExecute = jest.fn(() => Promise.resolve(undefined));
    resolveExecute = jest.fn(() => Promise.resolve(undefined));

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: ListNotificationsUseCase, useValue: { execute: listExecute } },
        { provide: CountUnreadNotificationsUseCase, useValue: { execute: unreadCountExecute } },
        { provide: MarkNotificationReadUseCase, useValue: { execute: markReadExecute } },
        { provide: MarkAllNotificationsReadUseCase, useValue: { execute: markAllReadExecute } },
        { provide: ResolveNotificationUseCase, useValue: { execute: resolveExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    const member = activeMember();
    app.use((request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
      (request as ExpressRequest & { member?: WorkspaceMember }).member = member;
      next();
    });
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(() => {
    listExecute.mockClear();
    unreadCountExecute.mockClear();
    markReadExecute.mockClear();
    markAllReadExecute.mockClear();
    resolveExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /notifications', () => {
    it('returns the page contract shape', async () => {
      const response = await request(httpServer).get('/notifications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        items: [
          {
            id: 'notification-1',
            type: 'document_overdue',
            severity: 'error',
            createdAt: '2026-07-27T05:00:00.000Z',
            readAt: null,
            resolvedAt: null,
            resource: { kind: 'document', id: 'doc-1', projectId: 'project-1' },
            context: {
              subject: 'Acme SL - INV-1024',
              related: null,
              date: '2026-07-01',
              amount: 1210.55,
              conflictKind: null,
            },
          },
        ],
        total: 37,
        page: 1,
        size: 20,
        unreadCount: 12,
      });
      expect(listExecute).toHaveBeenCalledWith({ page: 1, size: 20, status: 'open', access: ACCESS });
    });

    it('forwards pagination and the unread filter', async () => {
      await request(httpServer).get('/notifications').query({ page: '2', size: '10', status: 'unread' });

      expect(listExecute).toHaveBeenCalledWith({ page: 2, size: 10, status: 'unread', access: ACCESS });
    });

    it('rejects a size above the maximum', async () => {
      const response = await request(httpServer).get('/notifications').query({ size: '99' });

      expect(response.status).toBe(400);
      expect(listExecute).not.toHaveBeenCalled();
    });

    it('rejects a page below 1', async () => {
      const response = await request(httpServer).get('/notifications').query({ page: '0' });

      expect(response.status).toBe(400);
      expect(listExecute).not.toHaveBeenCalled();
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('returns the unread count', async () => {
      const response = await request(httpServer).get('/notifications/unread-count');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 12 });
      expect(unreadCountExecute).toHaveBeenCalledWith(ACCESS);
    });
  });

  describe('POST /notifications/read-all', () => {
    it('returns 204 and marks everything as read', async () => {
      const response = await request(httpServer).post('/notifications/read-all');

      expect(response.status).toBe(204);
      expect(markAllReadExecute).toHaveBeenCalledWith(ACCESS);
    });
  });

  describe('POST /notifications/:id/read', () => {
    it('returns 204 and marks the notification as read', async () => {
      const response = await request(httpServer).post('/notifications/notification-1/read');

      expect(response.status).toBe(204);
      expect(markReadExecute).toHaveBeenCalledWith({ id: 'notification-1', access: ACCESS });
    });

    it('returns 404 with the domain exception shape when the notification does not exist', async () => {
      markReadExecute.mockRejectedValueOnce(new NotificationNotFoundException('missing'));

      const response = await request(httpServer).post('/notifications/missing/read');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        code: 'ENTITY_NOT_FOUND',
        message: 'Notification with id missing was not found',
      });
    });
  });

  describe('POST /notifications/:id/resolve', () => {
    it('passes the active member access snapshot to the resolver', async () => {
      const response = await request(httpServer).post('/notifications/notification-1/resolve');

      expect(response.status).toBe(204);
      expect(resolveExecute).toHaveBeenCalledWith('notification-1', ACCESS);
    });
  });
});
