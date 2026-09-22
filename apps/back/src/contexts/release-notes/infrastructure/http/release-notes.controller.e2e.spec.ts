import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn(() => new Headers()) }));
jest.mock('../../../../lib/auth', () => ({ auth: { api: { getSession: jest.fn() } } }));

import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { MemberEmail } from '../../../auth/domain/value-objects/member-email';
import { PermissionMatrix } from '../../../auth/domain/value-objects/permission-matrix';
import { AcknowledgeReleaseNoteUseCase } from '../../application/acknowledge-release-note/acknowledge-release-note.use-case';
import { GetReleaseNoteAcknowledgementUseCase } from '../../application/get-release-note-acknowledgement/get-release-note-acknowledgement.use-case';
import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { ReleaseNotesController } from './release-notes.controller';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import { CLOCK } from '../../../../shared/domain/clock.port';
import { AUTH_SESSION_RESOLVER } from '../../../../shared/domain/auth-session-resolver.port';
import { WORKSPACE_MEMBER_REPOSITORY } from '../../../auth/domain/workspace-member.repository';
import { AccessGuard } from '../../../../shared/infrastructure/http/access/access.guard';
import { OriginGuard } from '../../../../shared/infrastructure/http/access/origin.guard';

const MEMBER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MEMBER_EMAIL = 'viewer@ledgerly.dev';
const FRONTEND_ORIGIN = 'https://app.ledgerly.dev';

function viewerMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: MEMBER_ID,
    email: MemberEmail.create(MEMBER_EMAIL),
    name: 'Viewer',
    permissions: PermissionMatrix.create({
      dashboard: 'view',
      projects: 'view',
      calendar: 'view',
      documents: 'view',
      suppliers: 'view',
      equipment: 'view',
      staff: 'view',
    }),
    status: 'active',
    invitedAt: new Date('2026-09-01T00:00:00.000Z'),
  });
}

describe('ReleaseNotesController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let getExecute: jest.Mock;
  let acknowledgeExecute: jest.Mock;
  const memberRepository = { findByEmail: jest.fn(), save: jest.fn() };
  const sessionResolver = { resolve: jest.fn() };
  const clock = { now: () => new Date('2026-09-22T10:00:00.000Z'), todayIso: () => '2026-09-22' };

  beforeAll(async () => {
    getExecute = jest.fn();
    acknowledgeExecute = jest.fn();
    const moduleRef = await Test.createTestingModule({
      controllers: [ReleaseNotesController],
      providers: [
        { provide: GetReleaseNoteAcknowledgementUseCase, useValue: { execute: getExecute } },
        { provide: AcknowledgeReleaseNoteUseCase, useValue: { execute: acknowledgeExecute } },
        { provide: WORKSPACE_MEMBER_REPOSITORY, useValue: memberRepository },
        { provide: AUTH_SESSION_RESOLVER, useValue: sessionResolver },
        { provide: CLOCK, useValue: clock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalGuards(
      new OriginGuard({ get: () => FRONTEND_ORIGIN } as never),
      new AccessGuard(new Reflector(), memberRepository as never, sessionResolver, clock),
    );
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    getExecute.mockReset();
    acknowledgeExecute.mockReset();
    getExecute.mockResolvedValue(null);
    acknowledgeExecute.mockResolvedValue(undefined);
    sessionResolver.resolve.mockReset();
    sessionResolver.resolve.mockResolvedValue({
      session: { user: { email: MEMBER_EMAIL }, session: { createdAt: new Date(), token: 'session-token' } },
      setCookies: [],
    });
    memberRepository.findByEmail.mockReset();
    memberRepository.findByEmail.mockResolvedValue(viewerMember());
    memberRepository.save.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the exact acknowledgement body and private no-store cache policy for a viewer', async () => {
    const acknowledgedAt = new Date('2026-09-22T10:00:00.000Z');
    getExecute.mockResolvedValueOnce(
      ReleaseNoteAcknowledgement.create({
        workspaceMemberId: MEMBER_ID,
        releaseVersion: '1.1.0',
        acknowledgedAt,
      }),
    );

    const response = await request(httpServer).get('/api/release-notes/1.1.0/acknowledgement');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ acknowledged: true, acknowledgedAt: '2026-09-22T10:00:00.000Z' });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(getExecute).toHaveBeenCalledWith({ workspaceMemberId: MEMBER_ID, releaseVersion: '1.1.0' });
  });

  it('returns a null timestamp when the current member has not acknowledged the release', async () => {
    const response = await request(httpServer).get('/api/release-notes/1.1.0/acknowledgement');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ acknowledged: false, acknowledgedAt: null });
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('records the authenticated member and returns 204 without a body', async () => {
    const response = await request(httpServer)
      .post('/api/release-notes/1.1.0/acknowledgement')
      .set('Origin', FRONTEND_ORIGIN)
      .send({ workspaceMemberId: 'another-member' });

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(acknowledgeExecute).toHaveBeenCalledWith({ workspaceMemberId: MEMBER_ID, releaseVersion: '1.1.0' });
  });

  it.each(['01.1.0', '1.1.0-rc.1'])('rejects invalid route version %s with the shared code', async (version) => {
    const response = await request(httpServer).get(`/api/release-notes/${version}/acknowledgement`);

    expect(response.status).toBe(400);
    expect((response.body as { code: string }).code).toBe('INVALID_VALUE');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(getExecute).not.toHaveBeenCalled();
  });

  it('returns 401 when the caller has no session', async () => {
    sessionResolver.resolve.mockResolvedValueOnce({ session: null, setCookies: [] });

    const response = await request(httpServer).get('/api/release-notes/1.1.0/acknowledgement');

    expect(response.status).toBe(401);
    expect(getExecute).not.toHaveBeenCalled();
  });

  it('returns 403 when the authenticated session is not an active workspace member', async () => {
    memberRepository.findByEmail.mockResolvedValueOnce(null);

    const response = await request(httpServer).get('/api/release-notes/1.1.0/acknowledgement');

    expect(response.status).toBe(403);
    expect(getExecute).not.toHaveBeenCalled();
  });
});
