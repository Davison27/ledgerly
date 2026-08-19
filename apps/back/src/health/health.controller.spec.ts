import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

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
});
