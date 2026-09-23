import { GetScheduleBoardUseCase } from './get-schedule-board.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import {
  ScheduleEventFilter,
  ScheduleEventRepository,
  ScheduleEventVisibility,
} from '../../domain/schedule-event.repository';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleEquipmentReader, ScheduleEquipmentView } from '../../domain/schedule-equipment-reader.port';

const projectImage = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;
const fullScheduleAccess = { projects: 'edit', staff: 'edit', equipment: 'edit' } as const;

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  private lastFilter: ScheduleEventFilter | null = null;

  constructor(private events: ScheduleEvent[]) {}

  findById(id: string, visibility?: ScheduleEventVisibility): Promise<ScheduleEvent | null> {
    const event = this.events.find((candidate) => candidate.id === id) ?? null;

    if (
      event === null ||
      (visibility?.staff === false && event.staffMemberIds.length > 0) ||
      (visibility?.equipment === false && event.equipment.length > 0)
    ) {
      return Promise.resolve(null);
    }

    return Promise.resolve(event);
  }

  findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]> {
    this.lastFilter = filter;
    return Promise.resolve(this.events.filter((event) =>
      !(filter.excludeStaffAssignments && event.staffMemberIds.length > 0) &&
      !(filter.excludeEquipmentAssignments && event.equipment.length > 0),
    ));
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
    return this.lastFilter;
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

class FakeScheduleEquipmentReader implements ScheduleEquipmentReader {
  constructor(private readonly equipment: ScheduleEquipmentView[]) {}

  findByIds(ids: string[]): Promise<ScheduleEquipmentView[]> {
    return Promise.resolve(this.equipment.filter((equipment) => ids.includes(equipment.id)));
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
      new FakeScheduleEquipmentReader([]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' }, fullScheduleAccess);

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
      new FakeScheduleEquipmentReader([]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' }, fullScheduleAccess);

    expect(board.conflicts.filter((conflict) => conflict.kind === 'staff_overlap')).toHaveLength(2);
    expect(board.summary.errorCount).toBe(1);
    expect(board.summary.byKind.staff_overlap).toBe(1);
  });

  it('reports equipment_stock_unset as info without affecting errorCount', async () => {
    const event = ScheduleEvent.create({
      id: 'event-1',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: null, endTime: null }],
      equipment: [{ equipmentId: 'equipment-1', quantity: 3 }],
    });

    const useCase = new GetScheduleBoardUseCase(
      new InMemoryScheduleEventRepository([event]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleEquipmentReader([{ id: 'equipment-1', name: 'Carpa', stock: 0 }]),
    );

    const board = await useCase.execute({ from: '2026-07-01', to: '2026-07-31' }, fullScheduleAccess);

    expect(board.summary.errorCount).toBe(0);
    expect(board.summary.infoCount).toBe(1);
    expect(board.summary.byKind.equipment_stock_unset).toBe(1);
  });

  it('omits events linked to unreadable sections from the board and its conflict summary', async () => {
    const visibleEvent = ScheduleEvent.create({
      id: 'event-visible',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '08:00', endTime: '10:00' }],
    });
    const hiddenEvent = ScheduleEvent.create({
      id: 'event-hidden',
      projectId: 'project-1',
      days: [{ date: '2026-07-10', startTime: '09:00', endTime: '11:00' }],
      equipment: [{ equipmentId: 'equipment-1', quantity: 1 }],
    });
    const repository = new InMemoryScheduleEventRepository([visibleEvent, hiddenEvent]);
    const useCase = new GetScheduleBoardUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleEquipmentReader([{ id: 'equipment-1', name: 'Carpa', stock: 1 }]),
    );

    const board = await useCase.execute(
      { from: '2026-07-01', to: '2026-07-31' },
      { projects: 'view', staff: 'none', equipment: 'none' },
    );

    expect(board.events.map((view) => view.event.id)).toEqual(['event-visible']);
    expect(board.conflicts).toEqual([]);
    expect(board.summary.errorCount).toBe(0);
    expect(repository.getLastFilter()).toMatchObject({
      excludeStaffAssignments: true,
      excludeEquipmentAssignments: true,
    });
  });

  it('returns an empty board without querying when Projects.view is missing', async () => {
    const repository = new InMemoryScheduleEventRepository([]);
    const useCase = new GetScheduleBoardUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleEquipmentReader([]),
    );

    const board = await useCase.execute(
      { from: '2026-07-01', to: '2026-07-31' },
      { projects: 'none', staff: 'edit', equipment: 'edit' },
    );

    expect(board.events).toEqual([]);
    expect(board.conflicts).toEqual([]);
    expect(board.summary.errorCount).toBe(0);
    expect(repository.getLastFilter()).toBeNull();
  });
});
