import type { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProductsController } from './products.controller';
import { ListProductsUseCase } from '../../application/list-products/list-products.use-case';
import { CreateProductUseCase } from '../../application/create-product/create-product.use-case';
import { UpdateProductUseCase } from '../../application/update-product/update-product.use-case';
import { DeleteProductUseCase } from '../../application/delete-product/delete-product.use-case';
import { CreateProductCommand } from '../../application/create-product/create-product.command';
import { Product } from '../../domain/product';
import { ProductNotFoundException } from '../../domain/errors/product-not-found.exception';
import { ProductNameAlreadyExistsException } from '../../domain/errors/product-name-already-exists.exception';
import { DomainExceptionFilter } from '../../../../shared/infrastructure/http/domain-exception.filter';

function buildProduct(overrides: Partial<CreateProductCommand> & { id?: string } = {}): Product {
  return Product.create({
    id: overrides.id ?? 'product-1',
    name: overrides.name ?? 'Diseño web',
    price: overrides.price ?? null,
  });
}

describe('ProductsController (HTTP, no DB)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let listExecute: jest.Mock;
  let createExecute: jest.Mock;
  let updateExecute: jest.Mock;
  let deleteExecute: jest.Mock;

  beforeAll(async () => {
    listExecute = jest.fn(() => Promise.resolve([buildProduct()]));
    createExecute = jest.fn((command: CreateProductCommand) =>
      Promise.resolve(buildProduct(command)),
    );
    updateExecute = jest.fn((command: { id: string } & Partial<CreateProductCommand>) =>
      Promise.resolve(buildProduct(command)),
    );
    deleteExecute = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ListProductsUseCase, useValue: { execute: listExecute } },
        { provide: CreateProductUseCase, useValue: { execute: createExecute } },
        { provide: UpdateProductUseCase, useValue: { execute: updateExecute } },
        { provide: DeleteProductUseCase, useValue: { execute: deleteExecute } },
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

  describe('GET /products', () => {
    it('returns the product list as plain DTOs', async () => {
      const response = await request(httpServer).get('/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          id: 'product-1',
          name: 'Diseño web',
          price: null,
        },
      ]);
      expect(listExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /products', () => {
    it('creates a product and returns 201', async () => {
      const response = await request(httpServer)
        .post('/products')
        .send({ name: 'Diseño web', price: 500 });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: 'Diseño web', price: 500 });
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Diseño web', price: 500 }),
      );
    });

    it('creates a product without a price', async () => {
      const response = await request(httpServer).post('/products').send({ name: 'Consultoría' });

      expect(response.status).toBe(201);
      expect(createExecute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Consultoría', price: undefined }),
      );
    });

    it('returns 400 when name is missing', async () => {
      const response = await request(httpServer).post('/products').send({ price: 500 });

      expect(response.status).toBe(400);
      expect(createExecute).not.toHaveBeenCalled();
    });

    it('returns 409 when the name already exists', async () => {
      createExecute.mockRejectedValueOnce(new ProductNameAlreadyExistsException('Diseño web'));

      const response = await request(httpServer)
        .post('/products')
        .send({ name: 'Diseño web', price: 500 });

      expect(response.status).toBe(409);
    });
  });

  describe('PATCH /products/:id', () => {
    it('updates the product', async () => {
      const response = await request(httpServer)
        .patch('/products/product-1')
        .send({ name: 'Diseño gráfico', price: 600 });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'product-1', name: 'Diseño gráfico', price: 600 }),
      );
    });

    it('clears the price when it is omitted from the payload', async () => {
      const response = await request(httpServer)
        .patch('/products/product-1')
        .send({ name: 'Diseño gráfico' });

      expect(response.status).toBe(200);
      expect(updateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'product-1', name: 'Diseño gráfico', price: null }),
      );
    });

    it('returns 404 when the product is not found', async () => {
      updateExecute.mockRejectedValueOnce(new ProductNotFoundException('missing-id'));

      const response = await request(httpServer)
        .patch('/products/missing-id')
        .send({ name: 'Diseño gráfico' });

      expect(response.status).toBe(404);
    });

    it('returns 409 when renaming to an already used name', async () => {
      updateExecute.mockRejectedValueOnce(new ProductNameAlreadyExistsException('Diseño web'));

      const response = await request(httpServer)
        .patch('/products/product-1')
        .send({ name: 'Diseño web' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /products/:id', () => {
    it('returns 204 and forwards the id', async () => {
      const response = await request(httpServer).delete('/products/product-1');

      expect(response.status).toBe(204);
      expect(deleteExecute).toHaveBeenCalledWith('product-1');
    });
  });
});
