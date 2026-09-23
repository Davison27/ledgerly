import { buildQueryString, del, get, patch, post } from '@/shared/api/httpClient';
import { stripEmpty } from '@/shared/api/sanitize';
import type {
  CreateScheduleEventPayload,
  ScheduleBoardDto,
  ScheduleEditorBoardDto,
  ScheduleEditorSelectorDto,
  ScheduleEventDto,
  ScheduleEventListFilter,
  ScheduleEventMutationDto,
  SchedulableProjectDto,
  UpdateScheduleEventPayload,
} from './types';

export function getScheduleBoard(from: string, to: string): Promise<ScheduleBoardDto> {
  return get<ScheduleBoardDto>(`/schedule/board${buildQueryString({ from, to })}`);
}

export function listScheduleEvents(
  filter: ScheduleEventListFilter = {},
): Promise<ScheduleEventDto[]> {
  const qs = buildQueryString({
    from: filter.from,
    to: filter.to,
    projectId: filter.projectId,
    staffMemberId: filter.staffMemberId,
  });
  return get<ScheduleEventDto[]>(`/schedule/events${qs}`);
}

export function createScheduleEvent(
  payload: CreateScheduleEventPayload,
): Promise<ScheduleEventMutationDto> {
  return post<ScheduleEventMutationDto>('/schedule/events', stripEmpty(payload));
}

export function updateScheduleEvent(
  eventId: string,
  payload: UpdateScheduleEventPayload,
): Promise<ScheduleEventMutationDto> {
  return patch<ScheduleEventMutationDto>(`/schedule/events/${eventId}`, payload);
}

export function deleteScheduleEvent(eventId: string): Promise<void> {
  return del<void>(`/schedule/events/${eventId}`);
}

export function listSchedulableProjects(): Promise<SchedulableProjectDto[]> {
  return get<SchedulableProjectDto[]>('/schedule/schedulable-projects');
}

export function getCalendarEditorBoard(from: string, to: string): Promise<ScheduleEditorBoardDto> {
  return get<ScheduleEditorBoardDto>(
    `/schedule/editor/board${buildQueryString({ from, to })}`,
  );
}

export function listCalendarEditorProjects(): Promise<ScheduleEditorSelectorDto[]> {
  return get<ScheduleEditorSelectorDto[]>('/schedule/editor/projects');
}

export function listCalendarEditorStaff(): Promise<ScheduleEditorSelectorDto[]> {
  return get<ScheduleEditorSelectorDto[]>('/schedule/editor/staff');
}

export function listCalendarEditorEquipment(): Promise<ScheduleEditorSelectorDto[]> {
  return get<ScheduleEditorSelectorDto[]>('/schedule/editor/equipment');
}
