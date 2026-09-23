import { GetCalendarEditorBoardUseCase } from './get-calendar-editor-board.use-case';
import { ScheduleEvent } from '../../domain/schedule-event';
import { ScheduleEventFilter, ScheduleEventRepository } from '../../domain/schedule-event.repository';
import {
  ScheduleProjectEditorReader,
} from '../../domain/schedule-project-reader.port';
import { ScheduleStaffEditorReader } from '../../domain/schedule-staff-reader.port';
import {
  ScheduleEquipmentEditorReader,
} from '../../domain/schedule-equipment-reader.port';

class InMemoryScheduleEventRepository implements ScheduleEventRepository {
  filter: ScheduleEventFilter | null = null;

  constructor(private readonly events: ScheduleEvent[]) {}

  findById(): Promise<ScheduleEvent | null> {
    return Promise.resolve(null);
  }

  findByFilter(filter: ScheduleEventFilter): Promise<ScheduleEvent[]> {
    this.filter = filter;
    return Promise.resolve(this.events);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GetCalendarEditorBoardUseCase', () => {
  it('returns schedule data and minimal labels for all linked assignments', async () => {
    const event = ScheduleEvent.create({
      id: 'event-1',
      projectId: 'project-1',
      title: 'Setup',
      notes: 'Main hall',
      days: [{ date: '2026-07-03', startTime: '08:00', endTime: '14:00' }],
      staffMemberIds: ['staff-1'],
      equipment: [{ equipmentId: 'equipment-1', quantity: 2 }],
    });
    const repository = new InMemoryScheduleEventRepository([event]);
    const projectReader = {
      findEditorOptions: jest.fn().mockResolvedValue([]),
      findEditorLabelsByIds: jest.fn().mockResolvedValue([{ id: 'project-1', displayName: 'Project' }]),
    } satisfies ScheduleProjectEditorReader;
    const staffReader = {
      findEditorOptions: jest.fn().mockResolvedValue([]),
      findEditorLabelsByIds: jest.fn().mockResolvedValue([{ id: 'staff-1', displayName: 'Ana García' }]),
    } satisfies ScheduleStaffEditorReader;
    const equipmentReader = {
      findEditorOptions: jest.fn().mockResolvedValue([]),
      findEditorLabelsByIds: jest.fn().mockResolvedValue([{ id: 'equipment-1', displayName: 'Canopy' }]),
    } satisfies ScheduleEquipmentEditorReader;
    const useCase = new GetCalendarEditorBoardUseCase(
      repository,
      projectReader,
      staffReader,
      equipmentReader,
    );

    await expect(useCase.execute({ from: '2026-07-01', to: '2026-07-31' })).resolves.toEqual([
      {
        id: 'event-1',
        title: 'Setup',
        notes: 'Main hall',
        startDate: '2026-07-03',
        endDate: '2026-07-03',
        projectId: 'project-1',
        days: [{ date: '2026-07-03', startTime: '08:00', endTime: '14:00' }],
        project: { id: 'project-1', displayName: 'Project' },
        staff: [{ id: 'staff-1', displayName: 'Ana García' }],
        equipment: [{ id: 'equipment-1', displayName: 'Canopy', quantity: 2 }],
      },
    ]);
    expect(repository.filter).toEqual({ from: '2026-07-01', to: '2026-07-31' });
    expect(projectReader.findEditorLabelsByIds).toHaveBeenCalledWith(['project-1']);
    expect(staffReader.findEditorLabelsByIds).toHaveBeenCalledWith(['staff-1']);
    expect(equipmentReader.findEditorLabelsByIds).toHaveBeenCalledWith(['equipment-1']);
  });
});
