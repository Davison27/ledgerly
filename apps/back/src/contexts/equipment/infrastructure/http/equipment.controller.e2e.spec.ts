import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { EquipmentController } from './equipment.controller';
import { ListEquipmentUseCase } from '../../application/list-equipment/list-equipment.use-case';
import { CreateEquipmentUseCase } from '../../application/create-equipment/create-equipment.use-case';
import { UpdateEquipmentUseCase } from '../../application/update-equipment/update-equipment.use-case';
import { DeleteEquipmentUseCase } from '../../application/delete-equipment/delete-equipment.use-case';
import { CreateEquipmentCommand } from '../../application/create-equipment/create-equipment.command';
import { Equipment } from '../../domain/equipment';
import { EquipmentNotFoundException } from '../../domain/errors/equipment-not-found.exception';
import { EquipmentNameAlreadyExistsException } from '../../domain/errors/equipment-name-already-exists.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildEquipment(overrides: Partial<CreateEquipmentCommand> & { id?: string } = {}): Equipment {
  return Equipment.create({
    id: overrides.id ?? 'equipment-1',
    name: overrides.name ?? 'Diseño web',
    price: overrides.price ?? null,
    stock: overrides.stock ?? 0,
  });
}

describe('EquipmentController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let createExecute: jest.Mock;
  let updateExecute: jest.Mock;
  let deleteExecute: jest.Mock;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildEquipment()]));
    createExecute = jest.fn((command: CreateEquipmentCommand) =>
      Promise.resolve(buildEquipment(command)),
    );
    updateExecute = jest.fn((command: { id: string } & Partial<CreateEquipmentCommand>) =>
      Promise.resolve(buildEquipment(command)),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [EquipmentController],
      providers: [
        { provide: ListEquipmentUseCase, useValue: { execute: listExecute } },
        { provide: CreateEquipmentUseCase, useValue: { execute: createExecute } },
        { provide: UpdateEquipmentUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteEquipmentUseCase, useValue: { execute: deleteExecute } },
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
    createExecute.mockClear();
    updateExecute.mockClear();
    deleteExecute.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /equipment', () => {
    it('returns the equipment list as plain DTOs', async () => {
      const response = await request(httpServer).get('/equipment');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'equipment-1',
          name: 'Diseño web',
          price: null,
          stock: 0,
          reference: null,
          category: null,
          brand: null,
          description: null,
          image: null,
          leasingMonthlyFee: null,
          tags: [],
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /equipment', () => {
    it('creates equipment and returns 201', async () => {
      const response = await request(httpServer)
        .post('/equipment')
        .send({ name: 'Diseño web', price: 500 });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: 'Diseño web', price: 500 });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Diseño web', price: 500 }),
      );
    });

    it('creates equipment without a price', async () => {
      const response = await request(httpServer).post('/equipment').send({ name: 'Consultoría' });

      expect(response.status).toBe(201);
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Consultoría', price: undefined }),
      );
    });

    it('returns 400 when name is missing', async () => {
      const response = await request(httpServer).post('/equipment').send({ price: 500 });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 409 when the name already exists', async () => {
      createExecute.mockRejectedValueOnce(new EquipmentNameAlreadyExistsException('Diseño web'));

      const response = await request(httpServer)
        .post('/equipment')
        .send({ name: 'Diseño web', price: 500 });

      expect(response.status).toBe(409);
    });
  });

  describe('PATCH /equipment/:id', () => {
    it('updates the equipment', async () => {
      const response = await request(httpServer)
        .patch('/equipment/equipment-1')
        .send({ name: 'Diseño gráfico', price: 600 });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'equipment-1', name: 'Diseño gráfico', price: 600 }),
      );
    });

    it('does not overwrite price when it is omitted from the payload', async () => {
      const response = await request(httpServer)
        .patch('/equipment/equipment-1')
        .send({ name: 'Diseño gráfico' });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'equipment-1', name: 'Diseño gráfico', price: undefined }),
      );
    });

    it('returns 404 when the equipment is not found', async () => {
      updateExecute.mockRejectedValueOnce(new EquipmentNotFoundException('missing-id'));

      const response = await request(httpServer)
        .patch('/equipment/missing-id')
        .send({ name: 'Diseño gráfico' });

      expect(response.status).toBe(404);
    });

    it('returns 409 when renaming to an already used name', async () => {
      updateExecute.mockRejectedValueOnce(new EquipmentNameAlreadyExistsException('Diseño web'));

      const response = await request(httpServer)
        .patch('/equipment/equipment-1')
        .send({ name: 'Diseño web' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /equipment/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/equipment/equipment-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('equipment-1');
    });
  });
});
