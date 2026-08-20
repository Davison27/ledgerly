import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { ScanForNotificationsUseCase } from '../../application/scan-for-notifications/scan-for-notifications.use-case';
import { PurgeReadNotificationsUseCase } from '../../application/purge-read-notifications/purge-read-notifications.use-case';

const SCAN_HOUR = 7;

function millisecondsUntilNextScan(now: Date): number {
  const next = new Date(now);
  next.setHours(SCAN_HOUR, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

@Injectable()
export class DailyNotificationScanScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyNotificationScanScheduler.name);
  private timeout: NodeJS.Timeout | undefined;

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly scanForNotificationsUseCase: ScanForNotificationsUseCase,
    private readonly purgeReadNotificationsUseCase: PurgeReadNotificationsUseCase,
  ) {}

  onModuleInit(): void {
    void this.runScan();
  }

  onModuleDestroy(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private scheduleNext(): void {
    const delay = millisecondsUntilNextScan(this.clock.now());

    this.timeout = setTimeout(() => {
      void this.runScan();
    }, delay);
    this.timeout.unref();
  }

  private async runScan(): Promise<void> {
    try {
      await this.scanForNotificationsUseCase.execute();
      await this.purgeReadNotificationsUseCase.execute();

      this.logger.log('Daily notification scan completed');
    } catch {
      this.logger.error('Daily notification scan failed');
    } finally {
      this.scheduleNext();
    }
  }
}
