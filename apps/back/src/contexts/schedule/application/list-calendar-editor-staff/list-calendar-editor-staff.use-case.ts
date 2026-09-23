import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_STAFF_READER,
  ScheduleStaffEditorReader,
  ScheduleStaffEditorOption,
} from '../../domain/schedule-staff-reader.port';

@Injectable()
export class ListCalendarEditorStaffUseCase {
  constructor(
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffEditorReader,
  ) {}

  execute(): Promise<ScheduleStaffEditorOption[]> {
    return this.staffReader.findEditorOptions();
  }
}
