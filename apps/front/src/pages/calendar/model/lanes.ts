import { contiguousRuns, type ScheduleEventDto } from '@/entities/schedule-event';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';
import type { DerivedProjectRange } from './derivedRanges';

export type CalendarLaneKind = 'event' | 'tax' | 'derived';

export interface CalendarBar {
  key: string;
  kind: CalendarLaneKind;
  eventId: string | null;
  taxDeadlineId: string | null;
  projectId: string;
  startIndex: number;
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  ownsStartHandle: boolean;
  ownsEndHandle: boolean;
  lane: number;
}

export interface LaneItem {
  key: string;
  kind: CalendarLaneKind;
  eventId: string | null;
  taxDeadlineId: string | null;
  projectId: string;
  startDate: string;
  endDate: string;
  ownsStartHandle: boolean;
  ownsEndHandle: boolean;
}

export function buildEventLaneItems(events: ScheduleEventDto[]): LaneItem[] {
  return events.flatMap((event) =>
    contiguousRuns(event.days).map((run, index) => ({
      key: `event-${event.id}-${index}`,
      kind: 'event' as const,
      eventId: event.id,
      taxDeadlineId: null,
      projectId: event.projectId,
      startDate: run[0].date,
      endDate: run[run.length - 1].date,
      ownsStartHandle: run[0].date === event.startDate,
      ownsEndHandle: run[run.length - 1].date === event.endDate,
    })),
  );
}

export function buildDerivedLaneItems(ranges: DerivedProjectRange[]): LaneItem[] {
  return ranges.map((range) => ({
    key: `derived-${range.projectId}`,
    kind: 'derived' as const,
    eventId: null,
    taxDeadlineId: null,
    projectId: range.projectId,
    startDate: range.startDate,
    endDate: range.endDate,
    ownsStartHandle: true,
    ownsEndHandle: true,
  }));
}

export function buildTaxDeadlineLaneItems(deadlines: TaxDeadlineDto[]): LaneItem[] {
  return deadlines.map((deadline) => ({
    key: `tax-${deadline.id}`,
    kind: 'tax' as const,
    eventId: null,
    taxDeadlineId: deadline.id,
    projectId: deadline.projectId,
    startDate: deadline.startDate,
    endDate: deadline.endDate,
    ownsStartHandle: true,
    ownsEndHandle: true,
  }));
}

function kindRank(kind: CalendarLaneKind): number {
  if (kind === 'event') return 0;
  if (kind === 'tax') return 1;
  return 2;
}

function compareBars(a: CalendarBar, b: CalendarBar): number {
  if (kindRank(a.kind) !== kindRank(b.kind)) return kindRank(a.kind) - kindRank(b.kind);
  if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
  if (a.span !== b.span) return b.span - a.span;
  return a.key.localeCompare(b.key);
}

function clipToWeek(item: LaneItem, weekDates: string[]): CalendarBar | null {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];
  if (item.endDate < weekStart || item.startDate > weekEnd) return null;

  const clippedStart = item.startDate < weekStart ? weekStart : item.startDate;
  const clippedEnd = item.endDate > weekEnd ? weekEnd : item.endDate;
  const startIndex = weekDates.indexOf(clippedStart);
  const endIndex = weekDates.indexOf(clippedEnd);
  const continuesBefore = item.startDate < weekStart;
  const continuesAfter = item.endDate > weekEnd;

  return {
    key: item.key,
    kind: item.kind,
    eventId: item.eventId,
    taxDeadlineId: item.taxDeadlineId,
    projectId: item.projectId,
    startIndex,
    span: endIndex - startIndex + 1,
    continuesBefore,
    continuesAfter,
    ownsStartHandle: item.ownsStartHandle && !continuesBefore,
    ownsEndHandle: item.ownsEndHandle && !continuesAfter,
    lane: 0,
  };
}

export function layoutWeek(
  weekDates: string[],
  items: LaneItem[],
): { bars: CalendarBar[]; laneCount: number } {
  const clipped = items
    .map((item) => clipToWeek(item, weekDates))
    .filter((bar): bar is CalendarBar => bar !== null)
    .sort(compareBars);

  const laneEnds: number[] = [];
  const bars: CalendarBar[] = [];

  for (const bar of clipped) {
    const barEnd = bar.startIndex + bar.span - 1;
    let lane = laneEnds.findIndex((end) => end < bar.startIndex);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(barEnd);
    } else {
      laneEnds[lane] = barEnd;
    }
    bars.push({ ...bar, lane });
  }

  return { bars, laneCount: laneEnds.length };
}
