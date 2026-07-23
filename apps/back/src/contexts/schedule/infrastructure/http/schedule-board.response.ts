import { ScheduleBoard } from '../../application/get-schedule-board/get-schedule-board.use-case';
import { ScheduleConflictKind } from '../../domain/schedule-conflict';
import { ScheduleEventResponse } from './schedule-event.response';
import { ScheduleConflictResponse } from './schedule-conflict.response';

export class ScheduleBoardSummaryResponse {
  errorCount: number;
  infoCount: number;
  byKind: Record<ScheduleConflictKind, number>;
}

export class ScheduleBoardResponse {
  events: ScheduleEventResponse[];
  conflicts: ScheduleConflictResponse[];
  summary: ScheduleBoardSummaryResponse;

  static fromDomain(board: ScheduleBoard): ScheduleBoardResponse {
    const response = new ScheduleBoardResponse();

    response.events = board.events.map((view) => ScheduleEventResponse.fromView(view));
    response.conflicts = board.conflicts.map((conflict) => ScheduleConflictResponse.fromDomain(conflict));
    response.summary = board.summary;

    return response;
  }
}
