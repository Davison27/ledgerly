import { ScheduleConflict } from '../../domain/schedule-conflict';

export class ScheduleConflictResponse {
  kind: string;
  severity: string;
  eventId: string;
  date: string | null;
  staffMemberId: string | null;
  equipmentId: string | null;
  relatedEventId: string | null;
  stock: number | null;
  allocated: number | null;

  static fromDomain(conflict: ScheduleConflict): ScheduleConflictResponse {
    const response = new ScheduleConflictResponse();

    response.kind = conflict.kind;
    response.severity = conflict.severity;
    response.eventId = conflict.eventId;
    response.date = conflict.date;
    response.staffMemberId = conflict.staffMemberId;
    response.equipmentId = conflict.equipmentId;
    response.relatedEventId = conflict.relatedEventId;
    response.stock = conflict.stock;
    response.allocated = conflict.allocated;

    return response;
  }
}
