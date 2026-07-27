import { PurgeReadNotificationsUseCase } from './purge-read-notifications.use-case';
import { NotificationRepository } from '../../domain/notification.repository';
import { Notification } from '../../domain/notification';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { Clock } from '../../../../shared/domain/clock.port';

class FakeNotificationRepository implements NotificationRepository {
  public receivedThreshold: Date | undefined;

  constructor(private readonly deletedCount: number) {}

  insertIfAbsent(): Promise<Notification[]> {
    return Promise.resolve([]);
  }

  findById(): Promise<Notification | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  findPage(): Promise<Page<NotificationListRow>> {
    return Promise.resolve({ items: [], total: 0, page: 1, size: 20 });
  }

  countUnread(): Promise<number> {
    return Promise.resolve(0);
  }

  markAllRead(): Promise<void> {
    return Promise.resolve();
  }

  deleteReadBefore(threshold: Date): Promise<number> {
    this.receivedThreshold = threshold;
    return Promise.resolve(this.deletedCount);
  }
}

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }

  todayIso(): string {
    return this.value.toISOString().slice(0, 10);
  }
}

describe('PurgeReadNotificationsUseCase', () => {
  it('deletes read notifications older than the retention threshold', async () => {
    const repository = new FakeNotificationRepository(3);
    const clock = new FixedClock(new Date('2026-07-18T00:00:00Z'));
    const useCase = new PurgeReadNotificationsUseCase(repository, clock);

    const result = await useCase.execute();

    expect(result).toEqual({ deleted: 3 });
    expect(repository.receivedThreshold?.toISOString()).toBe('2026-04-19T00:00:00.000Z');
  });
});
