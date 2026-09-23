import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import { ScheduleEventNotFoundException } from '../../domain/errors/schedule-event-not-found.exception';
import { canEditScheduleEvent, ScheduleAccessSnapshot } from '../schedule-access';

@Injectable()
export class DeleteScheduleEventUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
  ) {}

  async execute(id: string, access: ScheduleAccessSnapshot): Promise<boolean> {
    if (access.projects !== 'edit') {
      return false;
    }

    const event = await this.scheduleEventRepository.findById(id, {
      staff: access.staff !== 'none',
      equipment: access.equipment !== 'none',
    });

    if (event === null) {
      throw new ScheduleEventNotFoundException(id);
    }

    if (!canEditScheduleEvent(event, access)) {
      return false;
    }

    await this.scheduleEventRepository.delete(id);
    return true;
  }
}
