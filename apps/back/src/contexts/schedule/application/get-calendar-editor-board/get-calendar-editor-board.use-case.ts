import { Inject, Injectable } from '@nestjs/common';
import {
  SCHEDULE_EVENT_REPOSITORY,
  ScheduleEventRepository,
} from '../../domain/schedule-event.repository';
import {
  SCHEDULE_PROJECT_READER,
  ScheduleProjectEditorReader,
} from '../../domain/schedule-project-reader.port';
import { SCHEDULE_STAFF_READER, ScheduleStaffEditorReader } from '../../domain/schedule-staff-reader.port';
import {
  SCHEDULE_EQUIPMENT_READER,
  ScheduleEquipmentEditorReader,
} from '../../domain/schedule-equipment-reader.port';
import { ScheduleEventDayPrimitives } from '../../domain/schedule-event-day';
import { GetCalendarEditorBoardQuery } from './get-calendar-editor-board.query';
import { assertDateRangeWithinDays } from '../../../../shared/domain/date-range';
import { getListLimit } from '../../../../shared/infrastructure/list-limit';

export interface CalendarEditorBoardEvent {
  id: string;
  title: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  projectId: string;
  days: ScheduleEventDayPrimitives[];
  project: { id: string; displayName: string };
  staff: Array<{ id: string; displayName: string }>;
  equipment: Array<{ id: string; displayName: string; quantity: number }>;
}

@Injectable()
export class GetCalendarEditorBoardUseCase {
  constructor(
    @Inject(SCHEDULE_EVENT_REPOSITORY)
    private readonly scheduleEventRepository: ScheduleEventRepository,
    @Inject(SCHEDULE_PROJECT_READER)
    private readonly projectReader: ScheduleProjectEditorReader,
    @Inject(SCHEDULE_STAFF_READER)
    private readonly staffReader: ScheduleStaffEditorReader,
    @Inject(SCHEDULE_EQUIPMENT_READER)
    private readonly equipmentReader: ScheduleEquipmentEditorReader,
  ) {}

  async execute(query: GetCalendarEditorBoardQuery): Promise<CalendarEditorBoardEvent[]> {
    assertDateRangeWithinDays(
      query.from,
      query.to,
      getListLimit('MAX_CALENDAR_RANGE_DAYS', 366),
    );

    const events = await this.scheduleEventRepository.findByFilter({ from: query.from, to: query.to });
    const projectIds = [...new Set(events.map((event) => event.projectId))];
    const staffIds = [...new Set(events.flatMap((event) => event.staffMemberIds))];
    const equipmentIds = [...new Set(events.flatMap((event) => event.equipment.map(({ equipmentId }) => equipmentId)))];
    const [projects, staff, equipment] = await Promise.all([
      this.projectReader.findEditorLabelsByIds(projectIds),
      this.staffReader.findEditorLabelsByIds(staffIds),
      this.equipmentReader.findEditorLabelsByIds(equipmentIds),
    ]);
    const projectsById = new Map(projects.map((project) => [project.id, project]));
    const staffById = new Map(staff.map((member) => [member.id, member]));
    const equipmentById = new Map(equipment.map((item) => [item.id, item]));

    return events.flatMap((event) => {
      const project = projectsById.get(event.projectId);

      if (project === undefined) {
        return [];
      }

      return [{
        id: event.id,
        title: event.title,
        notes: event.notes,
        startDate: event.startDate,
        endDate: event.endDate,
        projectId: event.projectId,
        days: event.days.map((day) => day.toPrimitives()),
        project,
        staff: event.staffMemberIds.flatMap((id) => {
          const member = staffById.get(id);
          return member === undefined ? [] : [member];
        }),
        equipment: event.equipment.flatMap(({ equipmentId, quantity }) => {
          const item = equipmentById.get(equipmentId);
          return item === undefined ? [] : [{ ...item, quantity }];
        }),
      }];
    });
  }
}
