import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

import { configureHttpBoundary } from './main';

describe('HTTP boundary', () => {
  it('exposes the public root endpoint with CORS and cache headers', async () => {
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
});
