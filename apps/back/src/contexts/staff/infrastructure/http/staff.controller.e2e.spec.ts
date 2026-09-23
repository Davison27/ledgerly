import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import request from 'supertest';
import { StaffController } from './staff.controller';
import { ListStaffMembersUseCase } from '../../application/list-staff-members/list-staff-members.use-case';
import { GetStaffMemberUseCase } from '../../application/get-staff-member/get-staff-member.use-case';
import { CreateStaffMemberUseCase } from '../../application/create-staff-member/create-staff-member.use-case';
import { UpdateStaffMemberUseCase } from '../../application/update-staff-member/update-staff-member.use-case';
import { DeleteStaffMemberUseCase } from '../../application/delete-staff-member/delete-staff-member.use-case';
import { UnarchiveStaffMemberUseCase } from '../../application/unarchive-staff-member/unarchive-staff-member.use-case';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';
import type { StaffMemberSummary } from '../../domain/staff-member-summary';

function buildStaffSummary(): StaffMemberSummary {
  return {
    id: 'staff-1',
    firstName: 'Ana',
    lastName: 'García',
    taxId: null,
    email: null,
    phone: null,
    position: 'Carpenter',
    hireDate: null,
    endDate: null,
    notes: 'Staff profile notes',
    archivedAt: null,
    documentCount: 2,
    earliestExpiryDate: '2026-12-31',
    documentStatus: 'expiring',
  };
}

describe('StaffController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let deleteExecute: jest.Mock;
  let unarchiveExecute: jest.Mock;
  let listExecute: jest.Mock<Promise<StaffMemberSummary[]>, []>;
  let documentsAllowed: boolean;

  beforeAll(async () => {
    documentsAllowed = false;
    listExecute = jest.fn<Promise<StaffMemberSummary[]>, []>().mockResolvedValue([buildStaffSummary()]);
    deleteExecute = jest.fn<Promise<'deleted' | 'archived'>, [string]>().mockResolvedValue('deleted');
    unarchiveExecute = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: ListStaffMembersUseCase, useValue: { execute: listExecute } },
        { provide: GetStaffMemberUseCase, useValue: {} },
        { provide: CreateStaffMemberUseCase, useValue: {} },
        { provide: UpdateStaffMemberUseCase, useValue: {} },
        { provide: DeleteStaffMemberUseCase, useValue: { execute: deleteExecute } },
        { provide: UnarchiveStaffMemberUseCase, useValue: { execute: unarchiveExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
      Object.assign(request, {
        member: {
          canAccess: (module: string, level: string) =>
            (module === 'staff' && level === 'view') ||
            (module === 'documents' && level === 'view' && documentsAllowed),
        },
      });
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('omits document summaries while preserving staff profile fields without Documents view access', async () => {
    const response = await request(httpServer).get('/staff');
    const staffMember =
      ((response.body as unknown) as Record<string, unknown>[])[0] ?? {};

    expect(response.status).toBe(200);
    expect(staffMember).toEqual(
      expect.objectContaining({
        id: 'staff-1',
        firstName: 'Ana',
        lastName: 'García',
        position: 'Carpenter',
        notes: 'Staff profile notes',
      }),
    );
    expect(staffMember).not.toHaveProperty('documentCount');
    expect(staffMember).not.toHaveProperty('earliestExpiryDate');
    expect(staffMember).not.toHaveProperty('documentStatus');
  });

  it('includes document summaries when the member can view Documents', async () => {
    documentsAllowed = true;
    const response = await request(httpServer).get('/staff');
    const staffMember =
      ((response.body as unknown) as Record<string, unknown>[])[0] ?? {};

    expect(response.status).toBe(200);
    expect(staffMember).toEqual(
      expect.objectContaining({
        documentCount: 2,
        earliestExpiryDate: '2026-12-31',
        documentStatus: 'expiring',
      }),
    );
  });

  it('returns the deletion outcome and forwards the id', async () => {
    const response = await request(httpServer).delete('/staff/staff-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ outcome: 'deleted' });
    expect(deleteExecute).toHaveBeenCalledWith('staff-1');
  });

  it('returns the unarchive outcome and forwards the id', async () => {
    const response = await request(httpServer).post('/staff/staff-1/unarchive');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ outcome: 'unarchived' });
    expect(unarchiveExecute).toHaveBeenCalledWith('staff-1');
  });
});
