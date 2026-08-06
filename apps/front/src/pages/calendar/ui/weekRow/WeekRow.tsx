import { useMemo, type ReactNode } from 'react';
import { Popover, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';
import type { ConflictIndex } from '../../model/conflictIndex';
import { conflictsForEventInRange } from '../../model/conflictIndex';
import { WEEK_BAR_HEIGHT } from '../../model/eventDensity';
import { layoutWeek, type CalendarBar, type LaneItem } from '../../model/lanes';
import { DayCell } from '../dayCell/DayCell';
import { EventBar } from '../eventBar/EventBar';
import { DerivedRangeBar } from '../derivedRange/DerivedRangeBar';
import { TaxDeadlineBar } from '../taxDeadline/TaxDeadlineBar';
import styles from './WeekRow.module.css';

const { Text } = Typography;

const MONTH_HEADER_HEIGHT = 22;
const WEEK_HEADER_HEIGHT = 4;
const BAR_GAP = 3;
const MONTH_BAR_HEIGHT = 24;
const MONTH_MAX_LANES = 3;
const MONTH_MIN_HEIGHT = 88;
const WEEK_MIN_HEIGHT = 140;

export type CalendarRowVariant = 'month' | 'week';

export interface WeekRowProps {
  weekDates: string[];
  dayHeaders: ReactNode[];
  mutedDays?: boolean[];
  items: LaneItem[];
  eventsById: Map<string, ScheduleEventDto>;
  deadlinesById: Map<string, TaxDeadlineDto>;
  projectsById: Map<string, SchedulableProjectDto>;
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string, color: string | null) => string;
  variant: CalendarRowVariant;
  onSelectEvent: (event: ScheduleEventDto) => void;
  onSelectTaxDeadline: (deadline: TaxDeadlineDto) => void;
  onSelectDerived: (project: SchedulableProjectDto) => void;
}

function barLabel(
  bar: CalendarBar,
  eventsById: Map<string, ScheduleEventDto>,
  deadlinesById: Map<string, TaxDeadlineDto>,
  projectsById: Map<string, SchedulableProjectDto>,
): string {
  if (bar.kind === 'event') {
    const event = eventsById.get(bar.eventId ?? '');
    return event ? event.title?.trim() || event.project.name : '';
  }
  if (bar.kind === 'tax') {
    const deadline = deadlinesById.get(bar.taxDeadlineId ?? '');
    return deadline ? `${deadline.title} · ${deadline.projectName}` : '';
  }
  return projectsById.get(bar.projectId)?.name ?? '';
}

export function WeekRow({
  weekDates,
  dayHeaders,
  mutedDays,
  items,
  eventsById,
  deadlinesById,
  projectsById,
  conflictIndex,
  colorForProject,
  variant,
  onSelectEvent,
  onSelectTaxDeadline,
  onSelectDerived,
}: WeekRowProps) {
  const { t } = useTranslation();

  const { bars, laneCount } = useMemo(() => layoutWeek(weekDates, items), [weekDates, items]);

  const isMonth = variant === 'month';
  const headerHeight = isMonth ? MONTH_HEADER_HEIGHT : WEEK_HEADER_HEIGHT;
  const barHeight = isMonth ? MONTH_BAR_HEIGHT : WEEK_BAR_HEIGHT;
  const visibleLaneCount = isMonth ? Math.min(laneCount, MONTH_MAX_LANES) : laneCount;
  const visibleBars = isMonth ? bars.filter((bar) => bar.lane < MONTH_MAX_LANES) : bars;
  const hiddenBars = isMonth ? bars.filter((bar) => bar.lane >= MONTH_MAX_LANES) : [];
  const hasOverflow = hiddenBars.length > 0;

  const rowHeight = Math.max(
    headerHeight + (visibleLaneCount + (hasOverflow ? 1 : 0)) * (barHeight + BAR_GAP),
    isMonth ? MONTH_MIN_HEIGHT : WEEK_MIN_HEIGHT,
  );

  const overflowByDay = weekDates.map((_, dayIndex) =>
    hiddenBars.filter((bar) => dayIndex >= bar.startIndex && dayIndex < bar.startIndex + bar.span),
  );

  const rowKey = weekDates[0];

  return (
    <div className={styles.row} style={{ minHeight: rowHeight }}>
      <div className={styles.dayGrid}>
        {weekDates.map((date, index) => (
          <DayCell key={date} date={date} header={dayHeaders[index]} muted={mutedDays?.[index]} />
        ))}
      </div>
      <div
        className={styles.barsLayer}
        style={{ top: headerHeight, gridAutoRows: barHeight + BAR_GAP }}
      >
        {visibleBars.map((bar) => {
          const segmentStart = weekDates[bar.startIndex];
          const segmentEnd = weekDates[bar.startIndex + bar.span - 1];
          const event = bar.kind === 'event' ? eventsById.get(bar.eventId ?? '') : undefined;
          const deadline =
            bar.kind === 'tax' ? deadlinesById.get(bar.taxDeadlineId ?? '') : undefined;
          const project = bar.kind === 'derived' ? projectsById.get(bar.projectId) : undefined;

          return (
            <div
              key={bar.key}
              className={styles.barCell}
              style={{
                gridColumn: `${bar.startIndex + 1} / span ${bar.span}`,
                gridRow: bar.lane + 1,
              }}
            >
              {bar.kind === 'event' && event && (
                <EventBar
                  event={event}
                  barKey={bar.key}
                  rowKey={rowKey}
                  segmentStart={segmentStart}
                  segmentEnd={segmentEnd}
                  ownsStartHandle={bar.ownsStartHandle}
                  ownsEndHandle={bar.ownsEndHandle}
                  span={bar.span}
                  variant={variant}
                  color={colorForProject(bar.projectId, event.project.color)}
                  conflicts={conflictsForEventInRange(
                    conflictIndex,
                    bar.eventId ?? '',
                    segmentStart,
                    segmentEnd,
                  )}
                  onSelect={onSelectEvent}
                />
              )}
              {bar.kind === 'derived' && project && (
                <DerivedRangeBar
                  project={project}
                  rowKey={rowKey}
                  color={colorForProject(bar.projectId, project.color)}
                  onSelect={onSelectDerived}
                />
              )}
              {bar.kind === 'tax' && deadline && (
                <TaxDeadlineBar
                  deadline={deadline}
                  barKey={bar.key}
                  rowKey={rowKey}
                  span={bar.span}
                  variant={variant}
                  onSelect={onSelectTaxDeadline}
                />
              )}
            </div>
          );
        })}

        {hasOverflow &&
          overflowByDay.map((hiddenForDay, dayIndex) => {
            if (hiddenForDay.length === 0) return null;
            return (
              <div
                key={`overflow-${weekDates[dayIndex]}`}
                className={styles.overflowCell}
                style={{ gridColumn: `${dayIndex + 1} / span 1` }}
              >
                <Popover
                  trigger="click"
                  content={
                    <div className={styles.overflowList}>
                      {hiddenForDay.map((bar) => (
                        <Text
                          key={bar.key}
                          className={styles.overflowItem}
                          onClick={() => {
                            if (bar.kind === 'event') {
                              const event = eventsById.get(bar.eventId ?? '');
                              if (event) onSelectEvent(event);
                            } else if (bar.kind === 'tax') {
                              const deadline = deadlinesById.get(bar.taxDeadlineId ?? '');
                              if (deadline) onSelectTaxDeadline(deadline);
                            } else {
                              const project = projectsById.get(bar.projectId);
                              if (project) onSelectDerived(project);
                            }
                          }}
                        >
                          {barLabel(bar, eventsById, deadlinesById, projectsById)}
                        </Text>
                      ))}
                    </div>
                  }
                >
                  <Text type="secondary" className={styles.overflowTrigger}>
                    {t('calendar.moreEvents', { count: hiddenForDay.length })}
                  </Text>
                </Popover>
              </div>
            );
          })}
      </div>
    </div>
  );
}
