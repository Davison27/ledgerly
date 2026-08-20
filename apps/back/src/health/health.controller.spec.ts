import { RequestMethod, ServiceUnavailableException } from '@nestjs/common';
import { HEADERS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

function methodTarget(name: 'live' | 'ready'): object {
  const value = Object.getOwnPropertyDescriptor(HealthController.prototype, name)?.value as unknown;
  if (typeof value !== 'function') {
    throw new Error(`HealthController.${name} is not a method`);
  }

  return value;
}

describe('HealthController', () => {
  it('exposes a liveness response without touching the database', () => {
    const pingCheck = jest.fn();
    const database = { pingCheck } as unknown as TypeOrmHealthIndicator;
    const controller = new HealthController({} as HealthCheckService, database);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(pingCheck).not.toHaveBeenCalled();
  });

  it('checks the database for readiness', async () => {
    const check = jest.fn().mockResolvedValue({ status: 'ok' });
    const pingCheck = jest.fn().mockResolvedValue({ database: { status: 'up' } });
    const health = { check } as unknown as HealthCheckService;
    const database = { pingCheck } as unknown as TypeOrmHealthIndicator;
    const controller = new HealthController(health, database);

    await controller.ready();

    expect(check).toHaveBeenCalledTimes(1);
    const firstCall = check.mock.calls[0] as unknown as [Array<() => Promise<unknown>>];
    const checks = firstCall[0];
    await checks[0]();
    expect(pingCheck).toHaveBeenCalledWith('database');
  });

  it('keeps liveness and readiness on the reviewed public GET routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
    expect(Reflect.getMetadata(PATH_METADATA, methodTarget('live'))).toBe('/');
    expect(Reflect.getMetadata(PATH_METADATA, methodTarget('ready'))).toBe('ready');
    expect(Reflect.getMetadata(METHOD_METADATA, methodTarget('live'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(METHOD_METADATA, methodTarget('ready'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HEADERS_METADATA, methodTarget('ready'))).toEqual([
      { name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
    ]);
  });

  it('propagates readiness failures to the HTTP health layer', async () => {
    const failure = new ServiceUnavailableException({ status: 'error' });
    const health = { check: jest.fn().mockRejectedValue(failure) } as unknown as HealthCheckService;
    const database = { pingCheck: jest.fn() } as unknown as TypeOrmHealthIndicator;
    const controller = new HealthController(health, database);

    await expect(controller.ready()).rejects.toBe(failure);
  });
});
