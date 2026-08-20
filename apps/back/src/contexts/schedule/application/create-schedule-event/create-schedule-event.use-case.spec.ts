import { CreateScheduleEventUseCase } from './create-schedule-event.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository } from '../../domain/schedule-event.repository';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleProductReader, ScheduleProductView } from '../../domain/schedule-product-reader.port';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleStaffMemberNotFoundException } from '../../domain/errors/schedule-staff-member-not-found.exception';
import { ScheduleProductNotFoundException } from '../../domain/errors/schedule-product-not-found.exception';
import { IdGenerator } from '../../../../shared/domain/id-generator.port';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../shared/domain/domain-event-publisher.port';
import { ScheduleEventSavedEvent } from '../../domain/events/schedule-event-saved.event';

const projectImage = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  events: ScheduleEvent[] = [];

  findById(id: string): Promise<ScheduleEvent | null> {
    return Promise.resolve(this.events.find((event) => event.id === id) ?? null);
  }

  findByFilter(): Promise<ScheduleEvent[]> {
    return Promise.resolve([...this.events]);
  }

  save(event: ScheduleEvent): Promise<void> {
    const index = this.events.findIndex((existing) => existing.id === event.id);

    if (index === -1) {
      this.events.push(event);
    } else {
      this.events[index] = event;
    }

    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.events = this.events.filter((event) => event.id !== id);
    return Promise.resolve();
  }
}

class FakeScheduleProjectReader implements ScheduleProjectReader {
  constructor(private readonly projects: SchedulableProjectView[]) {}

  findActive(): Promise<SchedulableProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => project.status === 'active'));
  }

  findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    return Promise.resolve(this.projects.filter((project) => ids.includes(project.id)));
  }
}

class FakeScheduleStaffReader implements ScheduleStaffReader {
  constructor(private readonly staff: ScheduleStaffView[]) {}

  findByIds(ids: string[]): Promise<ScheduleStaffView[]> {
    return Promise.resolve(this.staff.filter((member) => ids.includes(member.id)));
  }
}

class FakeScheduleProductReader implements ScheduleProductReader {
  constructor(private readonly products: ScheduleProductView[]) {}

  findByIds(ids: string[]): Promise<ScheduleProductView[]> {
    return Promise.resolve(this.products.filter((product) => ids.includes(product.id)));
  }
}

class SequentialIdGenerator implements IdGenerator {
  private nextId = 1;

  generate(): string {
    return `event-${this.nextId++}`;
  }
}

class FakeDomainEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }

  register(): void {}
}

const PROJECT: SchedulableProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: projectImage,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  color: null,
  hasEvents: false,
};

const STAFF_MEMBER: ScheduleStaffView = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'García',
  hireDate: '2025-01-01',
  endDate: null,
};

const PRODUCT: ScheduleProductView = { id: 'product-1', name: 'Carpa', stock: 5 };

describe('CreateScheduleEventUseCase', () => {
  it('creates a schedule event and returns its view', async () => {
    const repository = new InMemoryScheduleEventRepository();
    const publisher = new FakeDomainEventPublisher();
    const useCase = new CreateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
      new SequentialIdGenerator(),
      publisher,
    );

    const view = await useCase.execute({
      projectId: 'project-1',
      title: 'Montaje',
      days: [
        { date: '2026-07-03', startTime: '08:00', endTime: '14:00' },
        { date: '2026-07-04' },
      ],
      staffMemberIds: ['staff-1'],
      products: [{ productId: 'product-1', quantity: 2 }],
    });

    expect(view.event.id).toBe('event-1');
    expect(view.event.startDate).toBe('2026-07-03');
    expect(view.project.id).toBe('project-1');
    expect(view.project.image).toBe(projectImage);
    expect(view.staff).toEqual([STAFF_MEMBER]);
    expect(view.products).toEqual([{ ...PRODUCT, quantity: 2 }]);
    expect(await repository.findById('event-1')).not.toBeNull();
    expect(publisher.published).toHaveLength(1);
    const [event] = publisher.published as ScheduleEventSavedEvent[];
    expect(event.name).toBe(ScheduleEventSavedEvent.EVENT_NAME);
    expect(event.eventId).toBe('event-1');
    expect(event.dates).toEqual(['2026-07-03', '2026-07-04']);
  });

  it('throws ScheduleProjectNotFoundException when the project does not exist', async () => {
    const useCase = new CreateScheduleEventUseCase(
      new InMemoryScheduleEventRepository(),
      new FakeScheduleProjectReader([]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ projectId: 'missing-project', days: [{ date: '2026-07-03' }] }),
    ).rejects.toThrow(ScheduleProjectNotFoundException);
  });

  it('throws ScheduleStaffMemberNotFoundException when a staff member does not exist', async () => {
    const useCase = new CreateScheduleEventUseCase(
      new InMemoryScheduleEventRepository(),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({
        projectId: 'project-1',
        days: [{ date: '2026-07-03' }],
        staffMemberIds: ['missing-staff'],
      }),
    ).rejects.toThrow(ScheduleStaffMemberNotFoundException);
  });

  it('throws ScheduleProductNotFoundException when a product does not exist', async () => {
    const useCase = new CreateScheduleEventUseCase(
      new InMemoryScheduleEventRepository(),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
      new SequentialIdGenerator(),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({
        projectId: 'project-1',
        days: [{ date: '2026-07-03' }],
        products: [{ productId: 'missing-product', quantity: 1 }],
      }),
    ).rejects.toThrow(ScheduleProductNotFoundException);
  });
});
