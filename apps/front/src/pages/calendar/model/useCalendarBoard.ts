import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  createScheduleEvent,
  daysBetween,
  deleteScheduleEvent,
  getScheduleBoard,
  listSchedulableProjects,
  shiftDays,
  updateScheduleEvent,
  type SchedulableProjectDto,
  type ScheduleBoardDto,
  type ScheduleEventDayPayload,
  type ScheduleEventDto,
  type UpdateScheduleEventPayload,
} from '@/entities/schedule-event';
import { listStaffMembers, type StaffMemberDto } from '@/entities/staff-member';
import { listProducts, type ProductDto } from '@/entities/product';
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
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => dayjs().format(DATE_FORMAT));
  const [board, setBoard] = useState<ScheduleBoardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [projects, setProjects] = useState<SchedulableProjectDto[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);

  const range = useMemo(() => computeRange(view, cursor), [view, cursor]);

  const loadBoard = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return getScheduleBoard(range.from, range.to)
      .then((fetched) => {
        setBoard(fetched);
        return fetched;
      })
      .catch(() => {
        setLoadError(true);
        return null;
      })
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  const loadProjects = useCallback(
    () => listSchedulableProjects().then(setProjects).catch(() => setProjects([])),
    [],
  );

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    listStaffMembers()
      .then(setStaffMembers)
      .catch(() => setStaffMembers([]));
    listProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

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
        products: [],
      }).then((created) => {
        void loadBoard();
        return created;
      }),
    [loadBoard],
  );

  const moveEvent = useCallback(
    (event: ScheduleEventDto, offsetInDays: number) =>
      updateScheduleEvent(event.id, { days: shiftDays(event.days, offsetInDays) }).then(
        (updated) => {
          void loadBoard();
          return updated;
        },
      ),
    [loadBoard],
  );

  const resizeEvent = useCallback(
    (event: ScheduleEventDto, days: ScheduleEventDayPayload[]) =>
      updateScheduleEvent(event.id, { days }).then((updated) => {
        void loadBoard();
        return updated;
      }),
    [loadBoard],
  );

  const saveEvent = useCallback(
    (eventId: string, payload: UpdateScheduleEventPayload) =>
      updateScheduleEvent(eventId, payload).then((updated) => {
        void loadBoard();
        return updated;
      }),
    [loadBoard],
  );

  const removeEvent = useCallback(
    (eventId: string) =>
      deleteScheduleEvent(eventId).then(() => {
        void loadBoard();
      }),
    [loadBoard],
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
        products: [],
      }).then((created) => {
        void loadBoard();
        void loadProjects();
        return created;
      });
    },
    [loadBoard, loadProjects],
  );

  const assignStaffToEvent = useCallback(
    (event: ScheduleEventDto, staffMemberId: string) => {
      if (event.staff.some((member) => member.id === staffMemberId)) {
        return Promise.resolve({ status: 'already-assigned' as const });
      }
      return updateScheduleEvent(event.id, {
        staffMemberIds: [...event.staff.map((member) => member.id), staffMemberId],
      }).then((updated) =>
        loadBoard().then((freshBoard) => ({
          status: 'assigned' as const,
          updated,
          board: freshBoard,
        })),
      );
    },
    [loadBoard],
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
    products,
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
