import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ClientsController } from './clients.controller';
import { ListClientsUseCase } from '../../application/list-clients/list-clients.use-case';
import { GetClientUseCase } from '../../application/get-client/get-client.use-case';
import { CreateClientUseCase } from '../../application/create-client/create-client.use-case';
import { UpdateClientUseCase } from '../../application/update-client/update-client.use-case';
import { DeleteClientUseCase } from '../../application/delete-client/delete-client.use-case';
import { UnarchiveClientUseCase } from '../../application/unarchive-client/unarchive-client.use-case';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

describe('ClientsController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let deleteExecute: jest.Mock;

  beforeAll(async () => {
    deleteExecute = jest.fn().mockResolvedValue('archived');
    const moduleRef = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: ListClientsUseCase, useValue: { execute: jest.fn().mockResolvedValue([]) } },
        { provide: GetClientUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateClientUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateClientUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteClientUseCase, useValue: { execute: deleteExecute } },
        { provide: UnarchiveClientUseCase, useValue: { execute: jest.fn() } },
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

  it('returns lightweight summaries with deterministic project counts', async () => {
    const listExecute = jest.spyOn(app.get(ListClientsUseCase), 'execute');
    listExecute.mockResolvedValueOnce([
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Acme SL',
        taxId: 'B12345678',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '+34 600 000 000',
        archivedAt: null,
        projectCount: 3,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Archived SL',
        taxId: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        archivedAt: '2026-09-21T10:00:00.000Z',
        projectCount: 1,
      },
    ]);

    const response = await request(httpServer).get('/clients');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Acme SL',
        taxId: 'B12345678',
        contactName: 'Ada Lovelace',
        contactEmail: 'ada@example.com',
        contactPhone: '+34 600 000 000',
        projectCount: 3,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Archived SL',
        taxId: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        archivedAt: '2026-09-21T10:00:00.000Z',
        projectCount: 1,
      },
    ]);
  });

  it('returns the locked client lifecycle outcome', async () => {
    const response = await request(httpServer).delete('/clients/00000000-0000-0000-0000-000000000001');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ outcome: 'archived' });
    expect(deleteExecute).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
  });
});
