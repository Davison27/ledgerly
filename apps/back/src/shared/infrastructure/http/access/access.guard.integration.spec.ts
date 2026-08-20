import type { Server } from 'http';
import { Controller, Get, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import request from 'supertest';

jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn(() => new Headers()) }));
jest.mock('../../../../lib/auth', () => ({
  auth: {
    api: { getSession: jest.fn() },
    handler: jest.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
  },
}));

import { auth } from '../../../../lib/auth';
import { AppController } from '../../../../app.controller';
import { AppService } from '../../../../app.service';
import { AuthController } from '../../../../contexts/auth/infrastructure/http/auth.controller';
import { BootstrapFirstAdminUseCase } from '../../../../contexts/auth/application/bootstrap-first-admin/bootstrap-first-admin.use-case';
import { GetCurrentMemberUseCase } from '../../../../contexts/auth/application/get-current-member/get-current-member.use-case';
import { WORKSPACE_MEMBER_REPOSITORY } from '../../../../contexts/auth/domain/workspace-member.repository';
import { WorkspaceMember } from '../../../../contexts/auth/domain/workspace-member';
import { MemberEmail } from '../../../../contexts/auth/domain/value-objects/member-email';
import { PermissionMatrix } from '../../../../contexts/auth/domain/value-objects/permission-matrix';
import { CompanyController } from '../../../../contexts/company/infrastructure/http/company.controller';
import { GetCompanyUseCase } from '../../../../contexts/company/application/get-company/get-company.use-case';
import { GetCompanyBrandingUseCase } from '../../../../contexts/company/application/get-company-branding/get-company-branding.use-case';
import { UpdateCompanyUseCase } from '../../../../contexts/company/application/update-company/update-company.use-case';
import { HealthController } from '../../../../health/health.controller';
import { CLOCK } from '../../../domain/clock.port';
import { AccessGuard } from './access.guard';
import { OriginGuard } from './origin.guard';

@Controller()
class UnclassifiedController {
  @Get('unclassified')
  getUnclassified(): { status: string } {
    return { status: 'unclassified' };
  }
}

function adminMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('admin@ledgerly.dev'),
    name: 'Admin',
    permissions: PermissionMatrix.admin(),
    status: 'active',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('authorization HTTP integration', () => {
  let app: INestApplication;
  let httpServer: Server;
  const getSession = jest.mocked(auth.api.getSession);
  const memberRepository = {
    countAll: jest.fn(),
    findByEmail: jest.fn(),
    save: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, HealthController, AuthController, CompanyController, UnclassifiedController],
      providers: [
        AppService,
        { provide: BootstrapFirstAdminUseCase, useValue: { execute: jest.fn(() => Promise.resolve(adminMember())) } },
        { provide: GetCurrentMemberUseCase, useValue: { execute: jest.fn() } },
        { provide: WORKSPACE_MEMBER_REPOSITORY, useValue: memberRepository },
        { provide: CLOCK, useValue: { now: () => new Date('2026-01-02T00:00:00.000Z'), todayIso: () => '2026-01-02' } },
        { provide: GetCompanyUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateCompanyUseCase, useValue: { execute: jest.fn() } },
        { provide: GetCompanyBrandingUseCase, useValue: { execute: jest.fn(() => Promise.resolve({ name: 'Ledgerly', logo: null, brandColor: null })) } },
        { provide: HealthCheckService, useValue: {} },
        { provide: TypeOrmHealthIndicator, useValue: {} },
      ],
    })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalGuards(
      new OriginGuard({ get: () => 'https://app.ledgerly.dev' } as never),
      new AccessGuard(
        new Reflector(),
        memberRepository as never,
        { now: () => new Date('2026-01-02T00:00:00.000Z'), todayIso: () => '2026-01-02' },
      ),
    );
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    getSession.mockReset();
    getSession.mockResolvedValue(null);
    memberRepository.countAll.mockReset();
    memberRepository.findByEmail.mockReset();
    memberRepository.save.mockReset();
    memberRepository.countAll.mockResolvedValue(1);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    '/',
    '/health',
    '/auth/status',
    '/company/branding',
    '/auth/better-auth-route',
  ])('allows the reviewed public route %s', async (path) => {
    const response = await request(httpServer).get(path);

    expect(response.status).toBeLessThan(400);
  });

  it('allows the reviewed public bootstrap route from the configured origin', async () => {
    const response = await request(httpServer)
      .post('/auth/bootstrap')
      .set('Origin', 'https://app.ledgerly.dev')
      .send({ email: 'admin@ledgerly.dev' });

    expect(response.status).toBe(201);
  });

  it('rejects an unsafe public request from an untrusted origin', async () => {
    const response = await request(httpServer)
      .post('/auth/bootstrap')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'admin@ledgerly.dev' });

    expect(response.status).toBe(403);
  });

  it('does not allow an unclassified handler to bypass access control', async () => {
    const response = await request(httpServer).get('/unclassified');

    expect(response.status).toBe(403);
  });

  it('does not expose an unknown path as public', async () => {
    const response = await request(httpServer).get('/not-a-public-route');

    expect(response.status).toBe(404);
  });

  it('requires a session for an actual protected controller route', async () => {
    const response = await request(httpServer).get('/company');

    expect(response.status).toBe(401);
  });
});
