import type { ScheduleEventDto } from '@/entities/schedule-event';

export const HOUR_HEIGHT = 44;
export const HOURS_IN_DAY = 24;
export const DEFAULT_SCROLL_HOUR = 8;
export const HOUR_GUTTER_WIDTH = 56;

export interface TimedSegment {
  key: string;
  eventId: string;
  projectId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnCount: number;
}

interface UnplacedSegment {
  key: string;
  eventId: string;
  projectId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

export function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = TIME_PATTERN.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function collectUnplacedSegments(events: ScheduleEventDto[], weekDates: string[]): UnplacedSegment[] {
  const segments: UnplacedSegment[] = [];

  for (const event of events) {
    for (const day of event.days) {
      const dayIndex = weekDates.indexOf(day.date);
      if (dayIndex === -1) continue;

      const startMinutes = parseTimeToMinutes(day.startTime);
      const endMinutes = parseTimeToMinutes(day.endTime);
      if (startMinutes === null || endMinutes === null) continue;

      segments.push({
        key: `${event.id}-${day.date}`,
        eventId: event.id,
        projectId: event.projectId,
        dayIndex,
        startMinutes,
        endMinutes: Math.max(endMinutes, startMinutes + 30),
      });
    }
  }

  return segments;
}

function layoutDaySegments(daySegments: UnplacedSegment[]): TimedSegment[] {
  const sorted = [...daySegments].sort((a, b) => a.startMinutes - b.startMinutes);
  const columnEnds: number[] = [];
  const placed = sorted.map((segment) => {
    let column = columnEnds.findIndex((end) => end <= segment.startMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(segment.endMinutes);
    } else {
      columnEnds[column] = segment.endMinutes;
    }
    return { ...segment, column };
  });

  const columnCount = columnEnds.length;
  return placed.map((segment) => ({ ...segment, columnCount }));
}

export function buildTimedSegments(events: ScheduleEventDto[], weekDates: string[]): TimedSegment[] {
  const unplaced = collectUnplacedSegments(events, weekDates);

  return weekDates.flatMap((_, dayIndex) =>
    layoutDaySegments(unplaced.filter((segment) => segment.dayIndex === dayIndex)),
  );
}

export function segmentGeometry(
  segment: TimedSegment,
): { top: number; height: number; leftPercent: number; widthPercent: number } {
  const top = (segment.startMinutes / 60) * HOUR_HEIGHT;
  const height = Math.max(((segment.endMinutes - segment.startMinutes) / 60) * HOUR_HEIGHT, 22);
  const leftPercent = (segment.column / segment.columnCount) * 100;
  const widthPercent = 100 / segment.columnCount;

  return { top, height, leftPercent, widthPercent };
}

export function initialScrollTop(segments: TimedSegment[]): number {
  if (segments.length === 0) return DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;

  const minStart = Math.min(...segments.map((segment) => segment.startMinutes));
  const clampedMinutes = Math.max(minStart - 60, 0);
  return (clampedMinutes / 60) * HOUR_HEIGHT;
}
