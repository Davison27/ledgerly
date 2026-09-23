import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectEditorReader,
  ScheduleProjectEditorOption,
} from '../../domain/schedule-project-reader.port';

@Injectable()
export class ListCalendarEditorProjectsUseCase {
  constructor(
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectEditorReader,
  ) {}

  execute(): Promise<ScheduleProjectEditorOption[]> {
    return this.projectReader.findEditorOptions();
  }
}
