import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EQUIPMENT_READER,
  ScheduleEquipmentEditorReader,
  ScheduleEquipmentEditorOption,
} from '../../domain/schedule-equipment-reader.port';

@Injectable()
export class ListCalendarEditorEquipmentUseCase {
  constructor(
    @Inject(SCHEDULE_EQUIPMENT_READER)
    private readonly equipmentReader: ScheduleEquipmentEditorReader,
  ) {}

  execute(): Promise<ScheduleEquipmentEditorOption[]> {
    return this.equipmentReader.findEditorOptions();
  }
}
