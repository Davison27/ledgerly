import { DeleteScheduleEventUseCase } from './delete-schedule-event.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository, ScheduleEventVisibility } from '../../domain/schedule-event.repository';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';

const fullScheduleAccess = { projects: 'edit', staff: 'edit', equipment: 'edit' } as const;

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  constructor(private events: ScheduleEvent[] = []) {}

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

function buildEvent(): ScheduleEvent {
  return ScheduleEvent.create({
    id: 'event-1',
    projectId: 'project-1',
    days: [{ date: '2026-07-03', startTime: null, endTime: null }],
  });
}

describe('DeleteScheduleEventUseCase', () => {
  it('deletes the event when it exists', async () => {
    const repository = new InMemoryScheduleEventRepository([buildEvent()]);
    const useCase = new DeleteScheduleEventUseCase(repository);

    await useCase.execute('event-1', fullScheduleAccess);

    expect(await repository.findById('event-1')).toBeNull();
  });

  it('throws ScheduleEventNotFoundException when the event does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository();
    const useCase = new DeleteScheduleEventUseCase(repository);

    await expect(useCase.execute('missing-event', fullScheduleAccess)).rejects.toThrow(
      ScheduleEventNotFoundException,
    );
  });

  it('does not delete events linked to sections without edit access', async () => {
    const repository = new InMemoryScheduleEventRepository([
      ScheduleEvent.create({
        id: 'event-1',
        projectId: 'project-1',
        days: [{ date: '2026-07-03', startTime: null, endTime: null }],
        equipment: [{ equipmentId: 'equipment-1', quantity: 1 }],
      }),
    ]);
    const useCase = new DeleteScheduleEventUseCase(repository);

    const removed = await useCase.execute('event-1', {
      projects: 'edit',
      staff: 'edit',
      equipment: 'view',
    });

    expect(removed).toBe(false);
    expect(await repository.findById('event-1')).not.toBeNull();
  });
});
