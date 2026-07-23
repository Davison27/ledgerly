import { ListScheduleEventsUseCase } from './list-schedule-events.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventFilter, ScheduleEventRepository } from '../../domain/schedule-event.repository';
import { ScheduleProjectReader, ScheduleProjectView } from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleProductReader, ScheduleProductView } from '../../domain/schedule-product-reader.port';

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  constructor(
    private events: ScheduleEvent[],
    private readonly lastFilter: { value: ScheduleEventFilter | null } = { value: null },
  ) {}

  findById(id: string): Promise<ScheduleEvent | null> {
    return Promise.resolve(this.events.find((event) => event.id === id) ?? null);
  }

  findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]> {
    this.lastFilter.value = filter;
    return Promise.resolve([...this.events]);
  }

  save(event: ScheduleEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.events = this.events.filter((event) => event.id !== id);
    return Promise.resolve();
  }

  getLastFilter(): ScheduleEventFilter | null {
    return this.lastFilter.value;
  }
}

class FakeScheduleProjectReader implements ScheduleProjectReader {
  constructor(private readonly projects: ScheduleProjectView[]) {}

  findActive(): Promise<ScheduleProjectView[]> {
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

const PROJECT: ScheduleProjectView = {
  id: 'project-1',
  name: 'Feria de muestras',
  code: 'FM-01',
  image: null,
  status: 'active',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

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
    days: [{ date: '2026-07-03', startTime: null, endTime: null }],
    staffMemberIds: ['staff-1'],
    products: [{ productId: 'product-1', quantity: 2 }],
  });
}

describe('ListScheduleEventsUseCase', () => {
  it('resolves the views for every event returned by the repository', async () => {
    const useCase = new ListScheduleEventsUseCase(
      new InMemoryScheduleEventRepository([buildEvent()]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([PRODUCT]),
    );

    const views = await useCase.execute({ projectId: 'project-1' });

    expect(views).toHaveLength(1);
    expect(views[0].project.id).toBe('project-1');
    expect(views[0].staff).toEqual([STAFF_MEMBER]);
    expect(views[0].products).toEqual([{ ...PRODUCT, quantity: 2 }]);
  });

  it('forwards the filter to the repository unchanged', async () => {
    const repository = new InMemoryScheduleEventRepository([]);
    const useCase = new ListScheduleEventsUseCase(
      repository,
      new FakeScheduleProjectReader([]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
    );

    const filter: ScheduleEventFilter = { staffMemberId: 'staff-1' };
    await useCase.execute(filter);

    expect(repository.getLastFilter()).toEqual(filter);
  });

  it('returns an empty array when there are no events', async () => {
    const useCase = new ListScheduleEventsUseCase(
      new InMemoryScheduleEventRepository([]),
      new FakeScheduleProjectReader([]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([]),
    );

    expect(await useCase.execute({})).toEqual([]);
  });
});
