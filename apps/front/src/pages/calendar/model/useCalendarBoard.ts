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
  type SchedulableProjectDto,
  type ScheduleEventDayPayload,
  type ScheduleEventDto,
  type UpdateScheduleEventPayload,
} from '@/entities/schedule-event';
import { staffQueries } from '@/entities/staff-member';
import { equipmentQueries } from '@/entities/equipment';
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

export function useCalendarBoard() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => dayjs().format(DATE_FORMAT));

  const range = useMemo(() => computeRange(view, cursor), [view, cursor]);

  const {
    data: board = null,
    isPending: loading,
    isError: loadError,
  } = useQuery(scheduleQueries.board(range.from, range.to));

  const { data: projects = [] } = useQuery(scheduleQueries.schedulableProjects());
  const { data: staffMembers = [] } = useQuery(staffQueries.list());
  const { data: equipment = [] } = useQuery(equipmentQueries.list());

  const goToday = useCallback(() => setCursor(dayjs().format(DATE_FORMAT)), []);

  const goPrevious = useCallback(() => {
    setCursor((prev) => dayjs(prev).subtract(1, view === 'month' ? 'month' : 'week').format(DATE_FORMAT));
  }, [view]);

  const goNext = useCallback(() => {
    setCursor((prev) => dayjs(prev).add(1, view === 'month' ? 'month' : 'week').format(DATE_FORMAT));
  }, [view]);

  const createFromDrop = useCallback(
    (projectId: string, date: string) =>
      createScheduleEvent({
        projectId,
        days: [{ date }],
        staffMemberIds: [],
        equipment: [],
      }).then(async (created) => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
        return created;
      }),
    [queryClient],
  );

  const moveEvent = useCallback(
    (event: ScheduleEventDto, offsetInDays: number) =>
      updateScheduleEvent(event.id, { days: shiftDays(event.days, offsetInDays) }).then(
        async (updated) => {
          await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
          return updated;
        },
      ),
    [queryClient],
  );

  const resizeEvent = useCallback(
    (event: ScheduleEventDto, days: ScheduleEventDayPayload[]) =>
      updateScheduleEvent(event.id, { days }).then(async (updated) => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
        return updated;
      }),
    [queryClient],
  );

  const saveEvent = useCallback(
    (eventId: string, payload: UpdateScheduleEventPayload) =>
      updateScheduleEvent(eventId, payload).then(async (updated) => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
        return updated;
      }),
    [queryClient],
  );

  const removeEvent = useCallback(
    (eventId: string) =>
      deleteScheduleEvent(eventId).then(async () => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
      }),
    [queryClient],
  );

  const materializeDerivedRange = useCallback(
    (project: SchedulableProjectDto, offsetInDays: number) => {
      const derivedRange = deriveProjectRange(project);
      if (!derivedRange) return Promise.reject(new Error('Project has no derivable range'));

      const shiftedStart = dayjs(derivedRange.startDate).add(offsetInDays, 'day').format(DATE_FORMAT);
      const shiftedEnd = dayjs(derivedRange.endDate).add(offsetInDays, 'day').format(DATE_FORMAT);
      const shiftedDays = daysBetween(shiftedStart, shiftedEnd);
      if (shiftedDays.length > MAX_DERIVED_RANGE_DAYS) {
        return Promise.reject(new DerivedRangeTooLongError());
      }

      return createScheduleEvent({
        projectId: project.id,
        days: shiftedDays.map((date) => ({ date })),
        staffMemberIds: [],
        equipment: [],
      }).then(async (created) => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
        return created;
      });
    },
    [queryClient],
  );

  const assignStaffToEvent = useCallback(
    (event: ScheduleEventDto, staffMemberId: string) => {
      if (event.staff.some((member) => member.id === staffMemberId)) {
        return Promise.resolve({ status: 'already-assigned' as const });
      }
      return updateScheduleEvent(event.id, {
        staffMemberIds: [...event.staff.map((member) => member.id), staffMemberId],
      }).then(async (updated) => {
        await queryClient.invalidateQueries({ queryKey: scheduleQueries.all });
        const freshBoard =
          queryClient.getQueryData(scheduleQueries.board(range.from, range.to).queryKey) ?? null;
        return {
          status: 'assigned' as const,
          updated,
          board: freshBoard,
        };
      });
    },
    [queryClient, range.from, range.to],
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
