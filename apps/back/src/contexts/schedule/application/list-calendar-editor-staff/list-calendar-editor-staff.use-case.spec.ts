import { ListCalendarEditorStaffUseCase } from './list-calendar-editor-staff.use-case';
import { ScheduleStaffEditorReader } from '../../domain/schedule-staff-reader.port';

describe('ListCalendarEditorStaffUseCase', () => {
  it('returns the active staff selector options from the reader', async () => {
    const options = [{ id: 'staff-1', displayName: 'Ana García' }];
    const reader = { findEditorOptions: jest.fn().mockResolvedValue(options) };
    const useCase = new ListCalendarEditorStaffUseCase(reader as unknown as ScheduleStaffEditorReader);

    await expect(useCase.execute()).resolves.toBe(options);
    expect(reader.findEditorOptions).toHaveBeenCalledTimes(1);
  });
});
