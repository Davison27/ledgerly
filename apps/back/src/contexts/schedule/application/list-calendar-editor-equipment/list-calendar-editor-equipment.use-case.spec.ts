import { ListCalendarEditorEquipmentUseCase } from './list-calendar-editor-equipment.use-case';
import { ScheduleEquipmentEditorReader } from '../../domain/schedule-equipment-reader.port';

describe('ListCalendarEditorEquipmentUseCase', () => {
  it('returns the active equipment selector options from the reader', async () => {
    const options = [{ id: 'equipment-1', displayName: 'Canopy' }];
    const reader = { findEditorOptions: jest.fn().mockResolvedValue(options) };
    const useCase = new ListCalendarEditorEquipmentUseCase(reader as unknown as ScheduleEquipmentEditorReader);

    await expect(useCase.execute()).resolves.toBe(options);
    expect(reader.findEditorOptions).toHaveBeenCalledTimes(1);
  });
});
