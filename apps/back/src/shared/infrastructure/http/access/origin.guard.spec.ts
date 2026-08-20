import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OriginGuard } from './origin.guard';

function contextFor(method: string, headers: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        get: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('OriginGuard', () => {
  const guard = new OriginGuard({ get: jest.fn(() => 'https://app.ledgerly.dev') } as never);

  it('allows safe methods without an origin', () => {
    expect(guard.canActivate(contextFor('GET'))).toBe(true);
  });

  it('rejects unsafe methods without an allowed origin', () => {
    expect(() => guard.canActivate(contextFor('POST'))).toThrow(ForbiddenException);
  });

  it('rejects unsafe methods from a different origin', () => {
    expect(() => guard.canActivate(contextFor('PATCH', { origin: 'https://attacker.example' }))).toThrow(ForbiddenException);
  });

  it('allows unsafe methods from the configured frontend origin', () => {
    expect(guard.canActivate(contextFor('DELETE', { origin: 'https://app.ledgerly.dev' }))).toBe(true);
  });
});
