import { DeleteScheduleEventUseCase } from './delete-schedule-event.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventRepository } from '../../domain/schedule-event.repository';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  constructor(private events: ScheduleEvent[] = []) {}

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

    await useCase.execute('event-1');

    expect(await repository.findById('event-1')).toBeNull();
  });

  it('throws ScheduleEventNotFoundException when the event does not exist', async () => {
    const repository = new InMemoryScheduleEventRepository();
    const useCase = new DeleteScheduleEventUseCase(repository);

    await expect(useCase.execute('missing-event')).rejects.toThrow(ScheduleEventNotFoundException);
  });
});
