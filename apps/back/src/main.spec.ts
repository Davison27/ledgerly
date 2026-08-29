import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

import { configureHttpBoundary } from './main';

function appDouble() {
  return {
    set: jest.fn(),
    use: jest.fn(),
    useBodyParser: jest.fn(),
    enableCors: jest.fn(),
    setGlobalPrefix: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
  };
}

describe('configureHttpBoundary', () => {
  it('exposes the public root endpoint with the configured HTTP boundary', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    const app = moduleRef.createNestApplication();

    configureHttpBoundary(app as never, {
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.ledgerly.dev/',
      TRUST_PROXY: 'true',
    });

    await app.init();

    try {
      const response = await request(app.getHttpServer() as Server)
        .get('/api')
        .set('Origin', 'https://app.ledgerly.dev')
        .expect(200);

      expect(response.text).toBe('Ledgerly ERP API');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['access-control-allow-origin']).toBe('https://app.ledgerly.dev');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    } finally {
      await app.close();
    }
  });

  it('sets proxy trust to false outside production', () => {
    const app = appDouble();

    configureHttpBoundary(app as never, {
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:5173',
      TRUST_PROXY: 'false',
    });

    expect(app.set).toHaveBeenCalledWith('trust proxy', false);
  });

  it.each([
    { NODE_ENV: 'production', FRONTEND_URL: 'http://app.ledgerly.dev', TRUST_PROXY: 'true' },
    { NODE_ENV: 'production', FRONTEND_URL: 'https://app.ledgerly.dev', TRUST_PROXY: 'false' },
  ])('fails closed for unsafe production transport configuration', (environment) => {
    expect(() => configureHttpBoundary(appDouble() as never, environment)).toThrow();
  });
});
