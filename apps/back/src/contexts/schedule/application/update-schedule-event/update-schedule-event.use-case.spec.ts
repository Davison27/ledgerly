import { UpdateScheduleEventUseCase } from './update-schedule-event.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository } from '../../domain/schedule-event.repository';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleProductReader, ScheduleProductView } from '../../domain/schedule-product-reader.port';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleStaffMemberNotFoundException } from '../../domain/errors/schedule-staff-member-not-found.exception';
import { ScheduleProductNotFoundException } from '../../domain/errors/schedule-product-not-found.exception';

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  constructor(private events: ScheduleEvent[] = []) {}

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

const PROJECT: SchedulableProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: null,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  color: null,
  hasEvents: false,
};

const OTHER_PROJECT: SchedulableProjectView = { ...PROJECT, id: 'project-2', code: 'FM-02' };

const STAFF_MEMBER: ScheduleStaffView = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'García',
  hireDate: '2025-01-01',
  endDate: null,
};

const PRODUCT: ScheduleProductView = { id: 'product-1', name: 'Carpa', stock: 5 };

function buildEvent(): ScheduleEvent {
  return ScheduleEvent.create({
    id: 'event-1',
    projectId: 'project-1',
    title: 'Montaje',
    days: [{ date: '2026-07-03', startTime: null, endTime: null }],
    staffMemberIds: ['staff-1'],
    products: [{ productId: 'product-1', quantity: 2 }],
  });
}

describe('UpdateScheduleEventUseCase', () => {
  it('applies only the given changes and revalidates existence', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT, OTHER_PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    const view = await useCase.execute({ id: 'event-1', title: 'Evento actualizado' });

    expect(view.event.title).toBe('Evento actualizado');
    expect(view.event.projectId).toBe('project-1');
    expect(view.event.staffMemberIds).toEqual(['staff-1']);
  });

  it('replaces the project when a new projectId is given', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT, OTHER_PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    const view = await useCase.execute({ id: 'event-1', projectId: 'project-2' });

    expect(view.event.projectId).toBe('project-2');
    expect(view.project.id).toBe('project-2');
  });

  it('throws ScheduleEventNotFoundException when the event does not exist', async () => {
    const useCase = new UpdateScheduleEventUseCase(
      new InMemoryScheduleEventRepository(),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
    );

    await expect(useCase.execute({ id: 'missing-event', title: 'x' })).rejects.toThrow(
      ScheduleEventNotFoundException,
    );
  });

  it('throws ScheduleProjectNotFoundException when the new projectId does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    await expect(
      useCase.execute({ id: 'event-1', projectId: 'missing-project' }),
    ).rejects.toThrow(ScheduleProjectNotFoundException);
  });

  it('throws ScheduleStaffMemberNotFoundException when a new staff member does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    await expect(
      useCase.execute({ id: 'event-1', staffMemberIds: ['missing-staff'] }),
    ).rejects.toThrow(ScheduleStaffMemberNotFoundException);
  });

  it('throws ScheduleProductNotFoundException when a new product does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    await expect(
      useCase.execute({ id: 'event-1', products: [{ productId: 'missing-product', quantity: 1 }] }),
    ).rejects.toThrow(ScheduleProductNotFoundException);
  });
});
