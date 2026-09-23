import { ListScheduleEventsUseCase } from './list-schedule-events.use-case';
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

const EQUIPMENT: ScheduleEquipmentView = { id: 'equipment-1', name: 'Carpa', stock: 5 };

function buildEvent(): ScheduleEvent {
  return ScheduleEvent.create({
    id: 'event-1',
    projectId: 'project-1',
    days: [{ date: '2026-07-03', startTime: null, endTime: null }],
    staffMemberIds: ['staff-1'],
    equipment: [{ equipmentId: 'equipment-1', quantity: 2 }],
  });
}

describe('ListScheduleEventsUseCase', () => {
  it('resolves the views for every event returned by the repository', async () => {
    const useCase = new ListScheduleEventsUseCase(
      new InMemoryScheduleEventRepository([buildEvent()]),
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
    );

    const views = await useCase.execute({ projectId: 'project-1' }, fullScheduleAccess);

    expect(views).toHaveLength(1);
    expect(views[0].project.id).toBe('project-1');
    expect(views[0].project.image).toBe(projectImage);
    expect(views[0].staff).toEqual([STAFF_MEMBER]);
    expect(views[0].equipment).toEqual([{ ...EQUIPMENT, quantity: 2 }]);
  });

  it('forwards the filter to the repository unchanged', async () => {
    const repository = new InMemoryScheduleEventRepository([]);
    const useCase = new ListScheduleEventsUseCase(
      repository,
      new FakeScheduleProjectReader([]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleEquipmentReader([]),
    );

    const filter: ScheduleEventFilter = { staffMemberId: 'staff-1' };
    await useCase.execute(filter, fullScheduleAccess);

    expect(repository.getLastFilter()).toEqual({
      ...filter,
      excludeStaffAssignments: false,
      excludeEquipmentAssignments: false,
    });
  });

  it('returns an empty array when there are no events', async () => {
    const useCase = new ListScheduleEventsUseCase(
      new InMemoryScheduleEventRepository([]),
      new FakeScheduleProjectReader([]),
      new FakeScheduleStaffReader([]),
      new FakeScheduleEquipmentReader([]),
    );

    expect(await useCase.execute({}, fullScheduleAccess)).toEqual([]);
  });

  it('filters events linked to unreadable sections before returning the list', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new ListScheduleEventsUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
    );

    const views = await useCase.execute(
      {},
      { projects: 'view', staff: 'none', equipment: 'view' },
    );

    expect(views).toEqual([]);
    expect(repository.getLastFilter()).toMatchObject({
      excludeStaffAssignments: true,
      excludeEquipmentAssignments: false,
    });
  });

  it('does not query events or linked data without Projects.view', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const projectReader = new FakeScheduleProjectReader([PROJECT]);
    const useCase = new ListScheduleEventsUseCase(
      repository,
      projectReader,
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
    );

    const views = await useCase.execute({}, { projects: 'none', staff: 'edit', equipment: 'edit' });

    expect(views).toEqual([]);
    expect(repository.getLastFilter()).toBeNull();
  });
});
