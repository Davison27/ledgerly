import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectReader,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { ScheduleAccessSnapshot } from '../schedule-access';

@Injectable()
export class ListSchedulableProjectsUseCase {
  constructor(
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
  ) {}

  execute(access: ScheduleAccessSnapshot): Promise<SchedulableProjectView[]> {
    if (access.projects === 'none') {
      return Promise.resolve([]);
    }

    return this.projectReader.findActive();
  }
}
