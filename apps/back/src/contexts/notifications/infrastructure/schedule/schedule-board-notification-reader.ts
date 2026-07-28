import { Injectable } from '@nestjs/common';
import { GetScheduleBoardUseCase } from '../../../schedule/application/get-schedule-board/get-schedule-board.use-case';
import { ScheduleConflictKind } from '../../../schedule/domain/schedule-conflict';
import { NotificationConflictKind } from '../../domain/notification-conflict-kind';
import {
  NotificationScheduleConflictRow,
  NotificationScheduleEventRow,
  NotificationScheduleReader,
} from '../../domain/notification-schedule-reader.port';

const CONFLICT_KIND_MAP: Record<ScheduleConflictKind, NotificationConflictKind> = {
  staff_not_hired: 'staff_not_hired',
  outside_project_dates: 'outside_project_dates',
  staff_overlap: 'staff_overlap',
  project_not_active: 'project_not_active',
  product_overallocated: 'product_overallocated',
  product_stock_unset: 'product_stock_unset',
};

@Injectable()
export class ScheduleBoardNotificationReader implements NotificationScheduleReader {
  constructor(private readonly getScheduleBoardUseCase: GetScheduleBoardUseCase) {}

  async findUpcomingEvents(from: string, to: string): Promise<NotificationScheduleEventRow[]> {
    const board = await this.getScheduleBoardUseCase.execute({ from, to });

    return board.events.flatMap((view) =>
      view.event.days
        .filter((day) => day.date >= from && day.date <= to)
        .map((day) => ({
          eventId: view.event.id,
          projectId: view.project.id,
          projectName: view.project.name,
          title: view.event.title,
          date: day.date,
        })),
    );
  }

  async findBlockingConflicts(from: string, to: string): Promise<NotificationScheduleConflictRow[]> {
    const board = await this.getScheduleBoardUseCase.execute({ from, to });
    const eventById = new Map(board.events.map((view) => [view.event.id, view]));

    return board.conflicts
      .filter((conflict) => conflict.severity === 'error')
      .map((conflict) => {
        const view = eventById.get(conflict.eventId);

        return {
          eventId: conflict.eventId,
          projectId: view?.project.id ?? '',
          projectName: view?.project.name ?? '',
          title: view?.event.title ?? null,
          date: conflict.date,
          kind: CONFLICT_KIND_MAP[conflict.kind],
        };
      });
  }
}
