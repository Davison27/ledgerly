import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SuppliersController } from './suppliers.controller';
import { ListSuppliersUseCase } from '../../application/list-suppliers/list-suppliers.use-case';
import { GetSupplierUseCase } from '../../application/get-supplier/get-supplier.use-case';
import { CreateSupplierUseCase } from '../../application/create-supplier/create-supplier.use-case';
import { UpdateSupplierUseCase } from '../../application/update-supplier/update-supplier.use-case';
import { DeleteSupplierUseCase } from '../../application/delete-supplier/delete-supplier.use-case';
import { CreateSupplierCommand } from '../../application/create-supplier/create-supplier.command';
import { Supplier } from '../../domain/supplier';
import { SupplierNotFoundException } from '../../domain/errors/supplier-not-found.exception';
import { SupplierTaxIdAlreadyExistsException } from '../../domain/errors/supplier-tax-id-already-exists.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildSupplier(overrides: Partial<CreateSupplierCommand> & { id?: string } = {}): Supplier {
  return Supplier.create({
    id: overrides.id ?? 'supplier-1',
    name: overrides.name ?? 'Acme SL',
    taxId: overrides.taxId ?? null,
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    address: overrides.address ?? null,
    iban: overrides.iban ?? null,
    notes: overrides.notes ?? null,
  });
}

describe('SuppliersController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let getExecute: jest.Mock;
  let createExecute: jest.Mock;
  let updateExecute: jest.Mock;
  let deleteExecute: jest.Mock;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildSupplier()]));
    getExecute = jest.fn((id: string) => Promise.resolve(buildSupplier({ id })));
    createExecute = jest.fn((command: CreateSupplierCommand) =>
      Promise.resolve(buildSupplier(command)),
    );
    updateExecute = jest.fn((command: { id: string } & Partial<CreateSupplierCommand>) =>
      Promise.resolve(buildSupplier(command)),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        { provide: ListSuppliersUseCase, useValue: { execute: listExecute } },
        { provide: GetSupplierUseCase, useValue: { execute: getExecute } },
        { provide: CreateSupplierUseCase, useValue: { execute: createExecute } },
        { provide: UpdateSupplierUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteSupplierUseCase, useValue: { execute: deleteExecute } },
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

  describe('GET /suppliers', () => {
    it('returns the supplier list as plain DTOs', async () => {
      const response = await request(httpServer).get('/suppliers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'supplier-1',
          name: 'Acme SL',
          taxId: null,
          email: null,
          phone: null,
          address: null,
          iban: null,
          notes: null,
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /suppliers', () => {
    it('creates a supplier and returns 201', async () => {
      const response = await request(httpServer)
        .post('/suppliers')
        .send({ name: 'Acme SL', taxId: 'B12345678' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: 'Acme SL', taxId: 'B12345678' });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme SL', taxId: 'B12345678' }),
      );
    });

    it('returns 400 when name is missing', async () => {
      const response = await request(httpServer).post('/suppliers').send({ taxId: 'B12345678' });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 409 when the tax id already exists', async () => {
      createExecute.mockRejectedValueOnce(new SupplierTaxIdAlreadyExistsException('B12345678'));

      const response = await request(httpServer)
        .post('/suppliers')
        .send({ name: 'Acme SL', taxId: 'B12345678' });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /suppliers/:id', () => {
    it('returns the supplier', async () => {
      const response = await request(httpServer).get('/suppliers/supplier-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: 'supplier-1' });
      expect(getExecute).toHaveBeenCalledWith('supplier-1');
    });

    it('returns 404 when the supplier is not found', async () => {
      getExecute.mockRejectedValueOnce(new SupplierNotFoundException('missing-id'));

      const response = await request(httpServer).get('/suppliers/missing-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /suppliers/:id', () => {
    it('updates the supplier', async () => {
      const response = await request(httpServer)
        .patch('/suppliers/supplier-1')
        .send({ name: 'Renamed SL' });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'supplier-1', name: 'Renamed SL' }),
      );
    });
  });

  describe('DELETE /suppliers/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/suppliers/supplier-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('supplier-1');
    });
  });
});
