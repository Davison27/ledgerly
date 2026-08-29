import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
  it('redacts sensitive values recursively before writing a JSON event', () => {
    const write = jest.fn();
    const logger = new JsonLogger({ write, now: () => '2026-08-29T12:00:00.000Z' });

    logger.error('request failed', {
      requestId: 'req-1',
      authorization: 'Bearer secret-token',
      nested: { password: 'do-not-log', document: 'private-content' },
    });

    expect(write).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: '2026-08-29T12:00:00.000Z',
        level: 'error',
        message: 'request failed',
        context: {
          requestId: 'req-1',
          authorization: '[REDACTED]',
          nested: { password: '[REDACTED]', document: '[REDACTED]' },
        },
      }),
    );
  });
});
