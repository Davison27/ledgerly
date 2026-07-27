import { NotifyDuplicateDocumentUseCase } from './notify-duplicate-document.use-case';
import { NotificationRepository } from '../../domain/notification.repository';
import { NotificationDelivery } from '../../domain/notification-delivery.port';
import {
  DocumentDuplicateDetector,
  DuplicateDetectionCriteria,
} from '../../domain/document-duplicate-detector.port';
import { Notification } from '../../domain/notification';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { Clock } from '../../../../shared/domain/clock.port';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';

class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Notification[] = [];

  insertIfAbsent(notifications: Notification[]): Promise<Notification[]> {
    const existingKeys = new Set(this.notifications.map((notification) => notification.getDedupeKey()));
    const inserted = notifications.filter((notification) => !existingKeys.has(notification.getDedupeKey()));

    this.notifications.push(...inserted);

    return Promise.resolve(inserted);
  }

  findById(id: string): Promise<Notification | null> {
    return Promise.resolve(this.notifications.find((notification) => notification.getId() === id) ?? null);
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

  deleteReadBefore(): Promise<number> {
    return Promise.resolve(0);
  }

  get all(): Notification[] {
    return this.notifications;
  }
}

class FakeDocumentDuplicateDetector implements DocumentDuplicateDetector {
  public receivedCriteria: DuplicateDetectionCriteria | undefined;

  constructor(private readonly hasDuplicates_: boolean) {}

  hasDuplicates(criteria: DuplicateDetectionCriteria): Promise<boolean> {
    this.receivedCriteria = criteria;
    return Promise.resolve(this.hasDuplicates_);
  }
}

class FakeNotificationDelivery implements NotificationDelivery {
  public delivered: Notification[] = [];

  deliver(notifications: Notification[]): Promise<void> {
    this.delivered.push(...notifications);
    return Promise.resolve();
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

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `notification-${this.nextId++}`;
  }
}

const COMMAND = {
  documentId: 'doc-1',
  projectId: 'project-1',
  documentName: 'Invoice 1',
  invoiceNumber: 'INV-1',
  amount: 100,
  issuerName: 'Acme SL',
  issuerTaxId: 'B12345678',
};

describe('NotifyDuplicateDocumentUseCase', () => {
  it('creates a notification when the detector reports duplicates', async () => {
    const repository = new InMemoryNotificationRepository();
    const detector = new FakeDocumentDuplicateDetector(true);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyDuplicateDocumentUseCase(
      detector,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute(COMMAND);

    expect(repository.all).toHaveLength(1);
    expect(repository.all[0].getDedupeKey()).toBe('document_duplicate:doc-1');
    expect(delivery.delivered).toHaveLength(1);
    expect(detector.receivedCriteria).toEqual({
      documentId: 'doc-1',
      invoiceNumber: 'INV-1',
      amount: 100,
      issuerName: 'Acme SL',
      issuerTaxId: 'B12345678',
    });
  });

  it('does nothing when the invoice number is null', async () => {
    const repository = new InMemoryNotificationRepository();
    const detector = new FakeDocumentDuplicateDetector(true);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyDuplicateDocumentUseCase(
      detector,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute({ ...COMMAND, invoiceNumber: null });

    expect(repository.all).toHaveLength(0);
    expect(detector.receivedCriteria).toBeUndefined();
  });

  it('does nothing when the detector reports no duplicates', async () => {
    const repository = new InMemoryNotificationRepository();
    const detector = new FakeDocumentDuplicateDetector(false);
    const delivery = new FakeNotificationDelivery();
    const useCase = new NotifyDuplicateDocumentUseCase(
      detector,
      repository,
      delivery,
      new FixedClock(new Date('2026-07-18T09:00:00Z')),
      new SequentialIdGenerator(),
    );

    await useCase.execute(COMMAND);

    expect(repository.all).toHaveLength(0);
    expect(delivery.delivered).toHaveLength(0);
  });
});
