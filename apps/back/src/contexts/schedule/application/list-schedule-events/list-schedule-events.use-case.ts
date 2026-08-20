import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventFilter,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectReader,
} from '../../domain/schedule-project-reader.port';
import { SCHEDULE_STAFF_READER, ScheduleStaffReader } from '../../domain/schedule-staff-reader.port';
import {
  SCHEDULE_EQUIPMENT_READER,
  ScheduleEquipmentReader,
} from '../../domain/schedule-equipment-reader.port';
import { buildScheduleEventViews, ScheduleEventView } from '../../domain/schedule-event-view';

@Injectable()
export class ListScheduleEventsUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectReader,
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffReader,
    @Inject(SCHEDULE_EQUIPMENT_READER)
    private readonly equipmentReader: ScheduleEquipmentReader,
  ) {}

  async execute(filter: ScheduleEventFilter): Promise<ScheduleEventView[]> {
    const events = await this.scheduleEventRepository.findByFilter(filter);

    const projectIds = [...new Set(events.map((event) => event.projectId))];
    const staffIds = [...new Set(events.flatMap((event) => event.staffMemberIds))];
    const equipmentIds = [
      ...new Set(events.flatMap((event) => event.equipment.map((equipment) => equipment.equipmentId))),
    ];

    const [projects, staff, equipment] = await Promise.all([
      this.projectReader.findByIds(projectIds),
      this.staffReader.findByIds(staffIds),
      this.equipmentReader.findByIds(equipmentIds),
    ]);

    return buildScheduleEventViews(events, { projects, staff, equipment });
  }
}
