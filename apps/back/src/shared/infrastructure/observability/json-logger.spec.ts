import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
  it('drops arbitrary messages and context before writing an application event', () => {
    const write = jest.fn();
    const logger = new JsonLogger({ write, now: () => '2026-08-29T12:00:00.000Z' });

    logger.error('private document content', { cookie: 'session', file: Buffer.from('secret') });

    expect(write).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: '2026-08-29T12:00:00.000Z',
        level: 'error',
        event: 'application_log',
      }),
    );
  });

  it('writes only the allowlisted HTTP request fields', () => {
    const write = jest.fn();
    const logger = new JsonLogger({ write, now: () => '2026-08-29T12:00:00.000Z' });

    logger.logHttpRequest({
      requestId: 'req-1',
      method: 'POST',
      path: '/api/projects/project-1/documents',
      statusCode: 201,
      durationMs: 12,
    });

    expect(write).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: '2026-08-29T12:00:00.000Z',
        level: 'log',
        event: 'http_request',
        requestId: 'req-1',
        method: 'POST',
        path: '/api/projects/project-1/documents',
        statusCode: 201,
        durationMs: 12,
      }),
    );
  });
});
