import { Inject, Injectable } from '@nestjs/common';
import { SCHEDULE_EVENT_REPOSITORY, ScheduleEventRepository } from '../../domain/schedule-event.repository';
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
import { detectScheduleConflicts } from '../../domain/schedule-conflict-detector';
import { ScheduleConflict } from '../../domain/schedule-conflict';
import { GetScheduleBoardQuery } from './get-schedule-board.query';
import { ScheduleBoardSummary, summarizeScheduleConflicts } from './schedule-board-summary';
import { assertDateRangeWithinDays } from '../../../../shared/domain/date-range';
import { getListLimit } from '../../../../shared/infrastructure/list-limit';

export interface ScheduleBoard {
  events: ScheduleEventView[];
  conflicts: ScheduleConflict[];
  summary: ScheduleBoardSummary;
}

@Injectable()
export class GetScheduleBoardUseCase {
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

  async execute(query: GetScheduleBoardQuery): Promise<ScheduleBoard> {
    assertDateRangeWithinDays(
      query.from,
      query.to,
      getListLimit('MAX_CALENDAR_RANGE_DAYS', 366),
    );
    const events = await this.scheduleEventRepository.findByFilter({ from: query.from, to: query.to });

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

    const views = buildScheduleEventViews(events, { projects, staff, equipment });
    const conflicts = detectScheduleConflicts(views, { from: query.from, to: query.to });

    return { events: views, conflicts, summary: summarizeScheduleConflicts(conflicts) };
  }
}
