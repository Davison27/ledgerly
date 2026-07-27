import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';
import { NotificationRepository } from '../../domain/notification.repository';
import { Notification } from '../../domain/notification';
import { NotificationNotFoundException } from '../../domain/errors/notification-not-found.exception';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { Clock } from '../../../../shared/domain/clock.port';

class InMemoryNotificationRepository implements NotificationRepository {
  constructor(private notifications: Notification[] = []) {}

  insertIfAbsent(notifications: Notification[]): Promise<Notification[]> {
    return Promise.resolve(notifications);
  }

  findById(id: string): Promise<Notification | null> {
    return Promise.resolve(this.notifications.find((notification) => notification.getId() === id) ?? null);
  }

  save(notification: Notification): Promise<void> {
    this.notifications = this.notifications.map((existing) =>
      existing.getId() === notification.getId() ? notification : existing,
    );
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

  deleteReadBefore(): Promise<number> {
    return Promise.resolve(0);
  }

  get all(): Notification[] {
    return this.notifications;
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

function buildNotification(overrides: { id?: string; readAt?: Date | null } = {}): Notification {
  return Notification.create({
    id: overrides.id ?? 'notification-1',
    dedupeKey: 'document_overdue:doc-1',
    type: 'document_overdue',
    severity: 'error',
    context: { subject: 'Invoice 1', related: null, date: '2026-07-01', amount: 100, conflictKind: null },
    resource: { kind: 'document', id: 'doc-1', projectId: 'project-1' },
    createdAt: new Date('2026-07-10T00:00:00Z'),
    readAt: overrides.readAt ?? null,
    emailSentAt: null,
  });
}

describe('MarkNotificationReadUseCase', () => {
  it('marks a notification as read using the current time', async () => {
    const repository = new InMemoryNotificationRepository([buildNotification()]);
    const clock = new FixedClock(new Date('2026-07-18T09:00:00Z'));
    const useCase = new MarkNotificationReadUseCase(repository, clock);

    await useCase.execute({ id: 'notification-1' });

    expect(repository.all[0].getReadAt()).toEqual(new Date('2026-07-18T09:00:00Z'));
  });

  it('throws NotificationNotFoundException when the notification does not exist', async () => {
    const repository = new InMemoryNotificationRepository([]);
    const clock = new FixedClock(new Date('2026-07-18T09:00:00Z'));
    const useCase = new MarkNotificationReadUseCase(repository, clock);

    await expect(useCase.execute({ id: 'missing' })).rejects.toThrow(NotificationNotFoundException);
  });

  it('does not rewrite the read date when the notification was already read', async () => {
    const alreadyRead = new Date('2026-07-01T00:00:00Z');
    const repository = new InMemoryNotificationRepository([buildNotification({ readAt: alreadyRead })]);
    const clock = new FixedClock(new Date('2026-07-18T09:00:00Z'));
    const useCase = new MarkNotificationReadUseCase(repository, clock);

    await useCase.execute({ id: 'notification-1' });

    expect(repository.all[0].getReadAt()).toEqual(alreadyRead);
  });
});
