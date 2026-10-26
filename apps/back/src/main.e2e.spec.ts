import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { spawnSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import { request as httpRequest, type Server } from 'node:http';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

import { configureHttpBoundary } from './main';

async function createBoundaryApp() {
  const moduleRef = await Test.createTestingModule({
    controllers: [AppController],
    providers: [AppService],
  }).compile();
  const app = moduleRef.createNestApplication({ bodyParser: false, logger: false });

  configureHttpBoundary(app as never, {
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.ledgerly.dev/',
    TRUST_PROXY: 'true',
  });

  return app;
}

describe('HTTP boundary', () => {
  it('exposes the public root endpoint with CORS and cache headers', async () => {
    const app = await createBoundaryApp();
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

  it('accepts Brotli-compressed JSON requests within the body limit', async () => {
    const app = await createBoundaryApp();

    app.use('/http-body', (httpRequest: ExpressRequest, httpResponse: ExpressResponse) => {
      httpResponse.status(200).json(httpRequest.body as unknown);
    });
    await app.listen(0, '127.0.0.1');

    try {
      const server = app.getHttpServer() as Server;
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('HTTP server did not expose a TCP address');

      const response = await new Promise<{ statusCode: number | undefined; body: string }>((resolve, reject) => {
        const body = brotliCompressSync(Buffer.from('{"accepted":true}'));
        const outgoing = httpRequest({
          hostname: '127.0.0.1',
          port: address.port,
          path: '/http-body',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': 'br',
            'Content-Length': body.length,
          },
        }, (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
          incoming.once('end', () => resolve({
            statusCode: incoming.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          }));
        });
        outgoing.once('error', reject);
        outgoing.end(body);
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ accepted: true });
    } finally {
      await app.close();
    }
  });

  it('rejects JSON requests larger than the body limit', async () => {
    const app = await createBoundaryApp();
    await app.init();

    try {
      const body = JSON.stringify({ value: 'a'.repeat(256 * 1024) });

      await request(app.getHttpServer() as Server)
        .post('/api')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(413);
    } finally {
      await app.close();
    }
  });

  it('keeps the HTTP parser process alive when compressed JSON has trailing bytes', () => {
    const firstFrame = Buffer.concat([
      gzipSync(Buffer.from(JSON.stringify({ accepted: true }))),
      Buffer.from([0]),
    ]);
    const childSource = [
      "const Module = require('node:module');",
      'const originalLoad = Module._load;',
      'Module._load = function (request, parent, isMain) {',
      "  if (request === './app.module' && parent?.filename?.endsWith('/src/main.ts')) return { AppModule: class AppModule {} };",
      '  return originalLoad.call(this, request, parent, isMain);',
      '};',
      "const { Test } = require('@nestjs/testing');",
      "const http = require('node:http');",
      "const { configureHttpBoundary } = require('./src/main.ts');",
      'let finishRequest;',
      'function sendHealth(port) {',
      '  return new Promise((resolve, reject) => {',
      "    http.get({ hostname: '127.0.0.1', port, path: '/health' }, (response) => {",
      '      response.resume();',
      '      response.once("end", () => resolve(response.statusCode));',
      '    }).once("error", reject);',
      '  });',
      '}',
      '(async () => {',
      '  const moduleRef = await Test.createTestingModule({}).compile();',
      '  const app = moduleRef.createNestApplication({ bodyParser: false, logger: false });',
      "  configureHttpBoundary(app, { NODE_ENV: 'production', FRONTEND_URL: 'https://app.ledgerly.dev/', TRUST_PROXY: 'true' });",
      "  app.use('/http-body', (request, response) => {",
      '    request.once("end", () => response.status(200).json(request.body));',
      '    finishRequest();',
      '  });',
      "  app.use('/health', (_request, response) => response.sendStatus(200));",
      "  await app.listen(0, '127.0.0.1');",
      '  const port = app.getHttpServer().address().port;',
      `  const firstFrame = Buffer.from(${JSON.stringify(firstFrame.toString('base64'))}, 'base64');`,
      '  const trailingBytes = Buffer.alloc(100 * 1024, 0x58);',
      '  const requestResult = await new Promise((resolve, reject) => {',
      '    const input = http.request({',
      "      hostname: '127.0.0.1', port, path: '/http-body', method: 'POST',",
      "      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': firstFrame.length + trailingBytes.length },",
      '    }, (response) => {',
      '      let body = "";',
      '      response.setEncoding("utf8");',
      '      response.on("data", (chunk) => { body += chunk; });',
      '      response.once("end", () => resolve({ requestStatus: response.statusCode, requestBody: JSON.parse(body) }));',
      '    });',
      '    input.once("error", reject);',
      '    finishRequest = () => input.end(trailingBytes);',
      '    input.write(firstFrame);',
      '  });',
      '  await new Promise((resolve) => setTimeout(resolve, 100));',
      '  const healthStatus = await sendHealth(port);',
      '  await app.close();',
      '  process.stdout.write(JSON.stringify({ ...requestResult, healthStatus }));',
      '})().catch((error) => { console.error(error); process.exitCode = 1; });',
    ].join('\n');
    const child = spawnSync(process.execPath, ['--no-compilation-cache', '-r', 'ts-node/register', '-e', childSource], {
      encoding: 'utf8',
      timeout: 15000,
      cwd: process.cwd(),
    });

    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout.trim())).toEqual({
      requestStatus: 200,
      requestBody: { accepted: true },
      healthStatus: 200,
    });
  }, 20000);
});
