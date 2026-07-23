import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectReader,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';

@Injectable()
export class ListSchedulableProjectsUseCase {
  constructor(
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
  ) {}

  execute(): Promise<SchedulableProjectView[]> {
    return this.projectReader.findActive();
  }
}
