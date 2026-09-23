import { CalendarEditorBoardEvent } from '../../application/get-calendar-editor-board/get-calendar-editor-board.use-case';

export class ScheduleEditorEventResponse {
  id: string;
  title: string | null;
  notes: string | null;
  startDate: string;
  endDate: string;
  projectId: string;
  days: Array<{ date: string; startTime: string | null; endTime: string | null }>;
  project: { id: string; displayName: string };
  staff: Array<{ id: string; displayName: string }>;
  equipment: Array<{ id: string; displayName: string; quantity: number }>;

  static fromEvent(event: CalendarEditorBoardEvent): ScheduleEditorEventResponse {
    const response = new ScheduleEditorEventResponse();
    response.id = event.id;
    response.title = event.title;
    response.notes = event.notes;
    response.startDate = event.startDate;
    response.endDate = event.endDate;
    response.projectId = event.projectId;
    response.days = event.days.map(({ date, startTime, endTime }) => ({ date, startTime, endTime }));
    response.project = { id: event.project.id, displayName: event.project.displayName };
    response.staff = event.staff.map(({ id, displayName }) => ({ id, displayName }));
    response.equipment = event.equipment.map(({ id, displayName, quantity }) => ({ id, displayName, quantity }));
    return response;
  }
}
