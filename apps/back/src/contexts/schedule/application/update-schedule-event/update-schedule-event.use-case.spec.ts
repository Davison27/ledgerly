import { UpdateScheduleEventUseCase } from './update-schedule-event.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository } from '../../domain/schedule-event.repository';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffReader, ScheduleStaffView } from '../../domain/schedule-staff-reader.port';
import { ScheduleEquipmentReader, ScheduleEquipmentView } from '../../domain/schedule-equipment-reader.port';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { ScheduleProjectNotFoundException } from '../../domain/errors/schedule-project-not-found.exception';
import { ScheduleStaffMemberNotFoundException } from '../../domain/errors/schedule-staff-member-not-found.exception';
import { ScheduleEquipmentNotFoundException } from '../../domain/errors/schedule-equipment-not-found.exception';
import { DomainEvent } from '../../../../shared/domain/domain-event';
import { DomainEventPublisher } from '../../../../shared/domain/domain-event-publisher.port';
import { ScheduleEventSavedEvent } from '../../domain/events/schedule-event-saved.event';

const projectImage = `data:image/png;base64,${Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64')}`;

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

const OTHER_PROJECT: SchedulableProjectView = { ...PROJECT, id: 'project-2', code: 'FM-02' };

const STAFF_MEMBER: ScheduleStaffView = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'García',
  hireDate: '2025-01-01',
  endDate: null,
};

const EQUIPMENT: ScheduleEquipmentView = { id: 'equipment-1', name: 'Carpa', stock: 5 };

class FakeDomainEventPublisher implements DomainEventPublisher {
  published: DomainEvent[] = [];

  publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }

  register(): void {}
}

function buildEvent(): ScheduleEvent {
  return ScheduleEvent.create({
    id: 'event-1',
    projectId: 'project-1',
    title: 'Montaje',
    days: [{ date: '2026-07-03', startTime: null, endTime: null }],
    staffMemberIds: ['staff-1'],
    equipment: [{ equipmentId: 'equipment-1', quantity: 2 }],
  });
}

describe('UpdateScheduleEventUseCase', () => {
  it('applies only the given changes and revalidates existence', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const publisher = new FakeDomainEventPublisher();
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT, OTHER_PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
      publisher,
    );

    const view = await useCase.execute({ id: 'event-1', title: 'Evento actualizado' });

    expect(view.event.title).toBe('Evento actualizado');
    expect(view.event.projectId).toBe('project-1');
    expect(view.project.image).toBe(projectImage);
    expect(view.event.staffMemberIds).toEqual(['staff-1']);
    expect(publisher.published).toHaveLength(1);
    const [event] = publisher.published as ScheduleEventSavedEvent[];
    expect(event.name).toBe(ScheduleEventSavedEvent.EVENT_NAME);
    expect(event.eventId).toBe('event-1');
    expect(event.dates).toEqual(['2026-07-03']);
  });

  it('replaces the project when a new projectId is given', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT, OTHER_PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
      new FakeDomainEventPublisher(),
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
      new FakeScheduleEquipmentReader([]),
      new FakeDomainEventPublisher(),
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
      new FakeScheduleEquipmentReader([EQUIPMENT]),
      new FakeDomainEventPublisher(),
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
      new FakeScheduleEquipmentReader([EQUIPMENT]),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ id: 'event-1', staffMemberIds: ['missing-staff'] }),
    ).rejects.toThrow(ScheduleStaffMemberNotFoundException);
  });

  it('throws ScheduleEquipmentNotFoundException when a new equipment does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new UpdateScheduleEventUseCase(
      repository,
      new FakeScheduleProjectReader([PROJECT]),
      new FakeScheduleStaffReader([STAFF_MEMBER]),
      new FakeScheduleEquipmentReader([EQUIPMENT]),
      new FakeDomainEventPublisher(),
    );

    await expect(
      useCase.execute({ id: 'event-1', equipment: [{ equipmentId: 'missing-equipment', quantity: 1 }] }),
    ).rejects.toThrow(ScheduleEquipmentNotFoundException);
  });
});
