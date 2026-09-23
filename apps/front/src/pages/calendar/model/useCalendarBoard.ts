import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import {
  createScheduleEvent,
  daysBetween,
  deleteScheduleEvent,
  scheduleQueries,
  shiftDays,
  updateScheduleEvent,
  type ScheduleBoardDto,
  type ScheduleEditorBoardDto,
  type ScheduleEventDayPayload,
  type ScheduleEventMutationDto,
  type UpdateScheduleEventPayload,
} from '@/entities/schedule-event';
import { staffQueries } from '@/entities/staff-member';
import { equipmentQueries } from '@/entities/equipment';
import {
  mapEditorCalendarBoard,
  mapFullCalendarBoard,
  mapFullEquipmentOption,
  mapFullProjectOption,
  mapFullStaffOption,
  mapSelectorOption,
  type CalendarBoard,
  type CalendarEquipmentOption,
  type CalendarEvent,
  type CalendarProjectOption,
  type CalendarStaffOption,
} from './calendarEditorData';
import { deriveProjectRange, DerivedRangeTooLongError, MAX_DERIVED_RANGE_DAYS } from './derivedRanges';

export type CalendarView = 'month' | 'week';

const DATE_FORMAT = 'YYYY-MM-DD';

function mondayOf(day: Dayjs): Dayjs {
  return day.subtract((day.day() + 6) % 7, 'day');
}

function computeRange(view: CalendarView, cursor: string): { from: string; to: string } {
  const cursorDay = dayjs(cursor);
  if (view === 'week') {
    const monday = mondayOf(cursorDay);
    return { from: monday.format(DATE_FORMAT), to: monday.add(6, 'day').format(DATE_FORMAT) };
  }
  const monday = mondayOf(cursorDay.startOf('month'));
  return { from: monday.format(DATE_FORMAT), to: monday.add(41, 'day').format(DATE_FORMAT) };
}

export function useCalendarBoard({
  canViewCalendar,
  canEditCalendar,
  canViewProjects,
  canViewStaff,
  canViewEquipment,
}: {
  canViewCalendar: boolean;
  canEditCalendar: boolean;
  canViewProjects: boolean;
  canViewStaff: boolean;
  canViewEquipment: boolean;
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => dayjs().format(DATE_FORMAT));

  const range = useMemo(() => computeRange(view, cursor), [view, cursor]);
  const canEditSchedule = canEditCalendar;
  const editorMode = canEditSchedule && !(canViewProjects && canViewStaff && canViewEquipment);
  const canViewSchedule = canViewCalendar && canViewProjects;
  const canLoadBoard = canViewSchedule || editorMode;
  const useFullBoard = canViewSchedule && !editorMode;

  const fullBoardQuery = useQuery({
    ...scheduleQueries.board(range.from, range.to),
    enabled: useFullBoard,
    select: mapFullCalendarBoard,
  });
  const editorBoardQuery = useQuery({
    ...scheduleQueries.editorBoard(range.from, range.to),
    enabled: editorMode,
    select: mapEditorCalendarBoard,
  });
  const board: CalendarBoard | null = editorMode
    ? (editorBoardQuery.data ?? null)
    : useFullBoard
      ? (fullBoardQuery.data ?? null)
      : null;
  const loading = canLoadBoard && (editorMode ? editorBoardQuery.isPending : fullBoardQuery.isPending);
  const loadError = canLoadBoard && (editorMode ? editorBoardQuery.isError : fullBoardQuery.isError);

  const fullProjectsQuery = useQuery({
    ...scheduleQueries.schedulableProjects(),
    enabled: !editorMode && canViewProjects,
    select: (projects) => projects.map(mapFullProjectOption),
  });
  const editorProjectsQuery = useQuery({
    ...scheduleQueries.editorProjects(),
    enabled: editorMode,
    select: (projects) => projects.map(mapSelectorOption),
  });
  const fullStaffQuery = useQuery({
    ...staffQueries.list(),
    enabled: !editorMode && canViewStaff,
    select: (staffMembers) =>
      staffMembers.filter((staffMember) => !staffMember.archivedAt).map(mapFullStaffOption),
  });
  const editorStaffQuery = useQuery({
    ...scheduleQueries.editorStaff(),
    enabled: editorMode,
    select: (staffMembers) => staffMembers.map(mapSelectorOption),
  });
  const fullEquipmentQuery = useQuery({
    ...equipmentQueries.list(),
    enabled: !editorMode && canViewEquipment,
    select: (equipment) =>
      equipment.filter((item) => !item.archivedAt).map(mapFullEquipmentOption),
  });
  const editorEquipmentQuery = useQuery({
    ...scheduleQueries.editorEquipment(),
    enabled: editorMode,
    select: (equipment) => equipment.map(mapSelectorOption),
  });

  const projects: CalendarProjectOption[] = editorMode
    ? (editorProjectsQuery.data ?? [])
    : (fullProjectsQuery.data ?? []);
  const staffMembers: CalendarStaffOption[] = editorMode
    ? (editorStaffQuery.data ?? [])
    : (fullStaffQuery.data ?? []);
  const equipment: CalendarEquipmentOption[] = editorMode
    ? (editorEquipmentQuery.data ?? [])
    : (fullEquipmentQuery.data ?? []);

  const goToday = useCallback(() => setCursor(dayjs().format(DATE_FORMAT)), []);

  const goPrevious = useCallback(() => {
    setCursor((prev) => dayjs(prev).subtract(1, view === 'month' ? 'month' : 'week').format(DATE_FORMAT));
  }, [view]);

  const goNext = useCallback(() => {
    setCursor((prev) => dayjs(prev).add(1, view === 'month' ? 'month' : 'week').format(DATE_FORMAT));
  }, [view]);

  const refreshedBoard = useCallback(async (eventId?: string) => {
    await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
    let nextBoard: CalendarBoard | null = null;
    if (editorMode) {
      const board = queryClient.getQueryData<ScheduleEditorBoardDto>(
        scheduleQueries.editorBoard(range.from, range.to).queryKey,
      );
      if (board) nextBoard = mapEditorCalendarBoard(board);
    } else {
      const board = queryClient.getQueryData<ScheduleBoardDto>(
        scheduleQueries.board(range.from, range.to).queryKey,
      );
      if (board) nextBoard = mapFullCalendarBoard(board);
    }
    if (!nextBoard) return { board: null, event: null };
    return {
      board: nextBoard,
      event: eventId ? nextBoard.events.find((event) => event.id === eventId) ?? null : null,
    };
  }, [editorMode, queryClient, range.from, range.to]);

  const createFromDrop = useCallback(
    (projectId: string, date: string) =>
      createScheduleEvent({
        projectId,
        days: [{ date }],
        staffMemberIds: [],
        equipment: [],
      }).then(async () => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
      }),
    [queryClient],
  );

  const moveEvent = useCallback(
    (event: CalendarEvent, offsetInDays: number) =>
      updateScheduleEvent(event.id, { days: shiftDays(event.days, offsetInDays) }).then(() =>
        refreshedBoard(event.id).then(({ event: updated }) => updated),
      ),
    [refreshedBoard],
  );

  const resizeEvent = useCallback(
    (event: CalendarEvent, days: ScheduleEventDayPayload[]) =>
      updateScheduleEvent(event.id, { days }).then(() =>
        refreshedBoard(event.id).then(({ event: updated }) => updated),
      ),
    [refreshedBoard],
  );

  const saveEvent = useCallback(
    (eventId: string, payload: UpdateScheduleEventPayload) =>
      updateScheduleEvent(eventId, payload).then(() =>
        refreshedBoard(eventId).then(({ event: updated }) => updated),
      ),
    [refreshedBoard],
  );

  const removeEvent = useCallback(
    (eventId: string) =>
      deleteScheduleEvent(eventId).then(async () => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
      }),
    [queryClient],
  );

  const materializeDerivedRange = useCallback(
    async (project: CalendarProjectOption, offsetInDays: number): Promise<CalendarEvent | null> => {
      const derivedRange = deriveProjectRange(project);
      if (!derivedRange) throw new Error('Project has no derivable range');

      const shiftedStart = dayjs(derivedRange.startDate).add(offsetInDays, 'day').format(DATE_FORMAT);
      const shiftedEnd = dayjs(derivedRange.endDate).add(offsetInDays, 'day').format(DATE_FORMAT);
      const shiftedDays = daysBetween(shiftedStart, shiftedEnd);
      if (shiftedDays.length > MAX_DERIVED_RANGE_DAYS) throw new DerivedRangeTooLongError();

      const created: ScheduleEventMutationDto = await createScheduleEvent({
        projectId: project.id,
        days: shiftedDays.map((date) => ({ date })),
        staffMemberIds: [],
        equipment: [],
      });
      const refreshed = await refreshedBoard(created.id);
      return refreshed.event;
    },
    [refreshedBoard],
  );

  const assignStaffToEvent = useCallback(
    async (event: CalendarEvent, staffMemberId: string) => {
      if (event.staff.some((member) => member.id === staffMemberId)) {
        return { status: 'already-assigned' as const };
      }
      await updateScheduleEvent(event.id, {
        staffMemberIds: [...event.staff.map((member) => member.id), staffMemberId],
      });
      const refreshed = await refreshedBoard(event.id);
      return {
        status: 'assigned' as const,
        updated: refreshed.event,
        board: refreshed.board,
      };
    },
    [refreshedBoard],
  );

  return {
    view,
    setView,
    cursor,
    range,
    goToday,
    goPrevious,
    goNext,
    board,
    editorMode,
    canViewBoard: canLoadBoard,
    loading,
    loadError,
    projects,
    staffMembers,
    equipment,
    createFromDrop,
    moveEvent,
    resizeEvent,
    saveEvent,
    removeEvent,
    materializeDerivedRange,
    assignStaffToEvent,
  };
}

export type UseCalendarBoardResult = ReturnType<typeof useCalendarBoard>;
