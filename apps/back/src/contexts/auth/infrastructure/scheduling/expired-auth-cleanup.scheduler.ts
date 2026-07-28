import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PurgeExpiredSessionsUseCase } from '../../application/purge-expired-sessions/purge-expired-sessions.use-case';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class ExpiredAuthCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiredAuthCleanupScheduler.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(private readonly purgeExpiredSessionsUseCase: PurgeExpiredSessionsUseCase) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.runCleanup();
    }, CLEANUP_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearTimeout(this.interval);
    }
  }

  private async runCleanup(): Promise<void> {
    try {
      const result = await this.purgeExpiredSessionsUseCase.execute();

      this.logger.log(
        `Purged ${result.deletedSessions} expired sessions and ${result.deletedLoginAttempts} expired login attempts`,
      );
    } catch (error) {
      this.logger.error(
        'Expired auth cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
