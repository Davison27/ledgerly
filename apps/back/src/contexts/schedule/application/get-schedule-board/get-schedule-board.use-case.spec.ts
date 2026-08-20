import { GetScheduleBoardUseCase } from './get-schedule-board.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository } from '../../domain/schedule-event.repository';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleProductReader, ScheduleProductView } from '../../domain/schedule-product-reader.port';

const projectImage = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  constructor(private events: ScheduleEvent[]) {}

  findById(id: string): Promise<ScheduleEvent | null> {
    return Promise.resolve(this.events.find((event) => event.id === id) ?? null);
  }

  findByFilter(): Promise<ScheduleEvent[]> {
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

describe('GetScheduleBoardUseCase', () => {
  it('returns no conflicts for two events on the same day with disjoint time ranges', async () => {
    const eventA = ScheduleEvent.create({
      id: 'event-a',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '08:00', endTime: '10:00' }],
      staffMemberIds: ['staff-1'],
    });
    const eventB = ScheduleEvent.create({
      id: 'event-b',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '10:00', endTime: '12:00' }],
      staffMemberIds: ['staff-1'],
    });

    const useCase = new GetScheduleBoardUseCase(
      new InMemoryScheduleEventRepository([eventA, eventB]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' });

    expect(board.conflicts).toEqual([]);
    expect(board.summary.errorCount).toBe(0);
    expect(board.events[0].project.image).toBe(projectImage);
  });

  it('counts a staff_overlap pair once even though it is emitted for both events', async () => {
    const eventA = ScheduleEvent.create({
      id: 'event-a',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '08:00', endTime: '12:00' }],
      staffMemberIds: ['staff-1'],
    });
    const eventB = ScheduleEvent.create({
      id: 'event-b',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '10:00', endTime: '14:00' }],
      staffMemberIds: ['staff-1'],
    });

    const useCase = new GetScheduleBoardUseCase(
      new InMemoryScheduleEventRepository([eventA, eventB]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleProductReader([]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' });

    expect(board.conflicts.filter((conflict) => conflict.kind === 'staff_overlap')).toHaveLength(2);
    expect(board.summary.errorCount).toBe(1);
    expect(board.summary.byKind.staff_overlap).toBe(1);
  });

  it('reports product_stock_unset as info without affecting errorCount', async () => {
    const event = ScheduleEvent.create({
      id: 'event-1',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: null, endTime: null }],
      products: [{ productId: 'product-1', quantity: 3 }],
    });

    const useCase = new GetScheduleBoardUseCase(
      new InMemoryScheduleEventRepository([event]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleProductReader([{ id: 'product-1', name: 'Carpa', stock: 0 }]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' });

    expect(board.summary.errorCount).toBe(0);
    expect(board.summary.infoCount).toBe(1);
    expect(board.summary.byKind.product_stock_unset).toBe(1);
  });
});
