import { ListCalendarEditorProjectsUseCase } from './list-calendar-editor-projects.use-case';
import { ScheduleProjectEditorReader } from '../../domain/schedule-project-reader.port';

describe('ListCalendarEditorProjectsUseCase', () => {
  it('returns the active project selector options from the reader', async () => {
    const options = [{ id: 'project-1', displayName: 'Project' }];
    const reader = { findEditorOptions: jest.fn().mockResolvedValue(options) };
    const useCase = new ListCalendarEditorProjectsUseCase(reader as unknown as ScheduleProjectEditorReader);

    await expect(useCase.execute()).resolves.toBe(options);
    expect(reader.findEditorOptions).toHaveBeenCalledTimes(1);
  });
});
