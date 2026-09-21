import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { StaffController } from './staff.controller';
import { ListStaffMembersUseCase } from '../../application/list-staff-members/list-staff-members.use-case';
import { GetStaffMemberUseCase } from '../../application/get-staff-member/get-staff-member.use-case';
import { CreateStaffMemberUseCase } from '../../application/create-staff-member/create-staff-member.use-case';
import { UpdateStaffMemberUseCase } from '../../application/update-staff-member/update-staff-member.use-case';
import { DeleteStaffMemberUseCase } from '../../application/delete-staff-member/delete-staff-member.use-case';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

describe('StaffController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let deleteExecute: jest.Mock;

  beforeAll(async () => {
    deleteExecute = jest.fn<Promise<'deleted' | 'archived'>, [string]>().mockResolvedValue('deleted');

    const moduleRef = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        { provide: ListStaffMembersUseCase, useValue: {} },
        { provide: GetStaffMemberUseCase, useValue: {} },
        { provide: CreateStaffMemberUseCase, useValue: {} },
        { provide: UpdateStaffMemberUseCase, useValue: {} },
        { provide: DeleteStaffMemberUseCase, useValue: { execute: deleteExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the deletion outcome and forwards the id', async () => {
    const response = await request(httpServer).delete('/staff/staff-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ outcome: 'deleted' });
    expect(deleteExecute).toHaveBeenCalledWith('staff-1');
  });
});
