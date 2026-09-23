import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { canWriteSchedule, ScheduleWriteAccess } from '../schedule-access';

@Injectable()
export class DeleteScheduleEventUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
  ) {}

  async execute(id: string, access: ScheduleWriteAccess): Promise<boolean> {
    if (!canWriteSchedule(access)) {
      return false;
    }

    const event = await this.scheduleEventRepository.findById(id);

    if (event === null) {
      throw new ScheduleEventNotFoundException(id);
    }

    await this.scheduleEventRepository.delete(id);
    return true;
  }
}
