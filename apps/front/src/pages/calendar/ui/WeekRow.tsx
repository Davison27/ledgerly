import { useMemo, type ReactNode } from 'react';
import { Popover, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { ConflictIndex } from '../model/conflictIndex';
import { conflictsForEventInRange } from '../model/conflictIndex';
import { layoutWeek, type CalendarBar, type LaneItem } from '../model/lanes';
import { DayCell } from './DayCell';
import { EventBar } from './EventBar';
import { DerivedRangeBar } from './DerivedRangeBar';

const { Text } = Typography;

const MONTH_HEADER_HEIGHT = 22;
const WEEK_HEADER_HEIGHT = 4;
const BAR_GAP = 3;
const MONTH_BAR_HEIGHT = 20;
const WEEK_BAR_HEIGHT = 60;
const MONTH_MAX_LANES = 3;
const MONTH_MIN_HEIGHT = 88;
const WEEK_MIN_HEIGHT = 120;

export type CalendarRowVariant = 'month' | 'week';

export interface WeekRowProps {
  weekDates: string[];
  dayHeaders: ReactNode[];
  mutedDays?: boolean[];
  items: LaneItem[];
  eventsById: Map<string, ScheduleEventDto>;
  projectsById: Map<string, SchedulableProjectDto>;
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string, color: string | null) => string;
  variant: CalendarRowVariant;
  onSelectEvent: (event: ScheduleEventDto) => void;
  onSelectDerived: (project: SchedulableProjectDto) => void;
}

function barLabel(
  bar: CalendarBar,
  eventsById: Map<string, ScheduleEventDto>,
  projectsById: Map<string, SchedulableProjectDto>,
): string {
  if (bar.kind === 'event') {
    const event = eventsById.get(bar.eventId ?? '');
    return event ? event.title?.trim() || event.project.name : '';
  }
  return projectsById.get(bar.projectId)?.name ?? '';
}

export function WeekRow({
  weekDates,
  dayHeaders,
  mutedDays,
  items,
  eventsById,
  projectsById,
  conflictIndex,
  colorForProject,
  variant,
  onSelectEvent,
  onSelectDerived,
}: WeekRowProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

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
    <div style={{ position: 'relative', flex: 'none', height: rowHeight }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%' }}>
        {weekDates.map((date, index) => (
          <DayCell key={date} date={date} header={dayHeaders[index]} muted={mutedDays?.[index]} />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: headerHeight,
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridAutoRows: barHeight + BAR_GAP,
          padding: '0 6px',
          pointerEvents: 'none',
        }}
      >
        {visibleBars.map((bar) => {
          const segmentStart = weekDates[bar.startIndex];
          const segmentEnd = weekDates[bar.startIndex + bar.span - 1];
          const event = bar.kind === 'event' ? eventsById.get(bar.eventId ?? '') : undefined;
          const project = bar.kind === 'derived' ? projectsById.get(bar.projectId) : undefined;

          return (
            <div
              key={bar.key}
              style={{
                gridColumn: `${bar.startIndex + 1} / span ${bar.span}`,
                gridRow: bar.lane + 1,
                pointerEvents: 'auto',
                minWidth: 0,
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
                  conflicts={conflictsForEventInRange(conflictIndex, bar.eventId ?? '', segmentStart, segmentEnd)}
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
            </div>
          );
        })}

        {hasOverflow &&
          overflowByDay.map((hiddenForDay, dayIndex) => {
            if (hiddenForDay.length === 0) return null;
            return (
              <div
                key={`overflow-${weekDates[dayIndex]}`}
                style={{
                  gridColumn: `${dayIndex + 1} / span 1`,
                  gridRow: MONTH_MAX_LANES + 1,
                  pointerEvents: 'auto',
                }}
              >
                <Popover
                  trigger="click"
                  content={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {hiddenForDay.map((bar) => (
                        <Text
                          key={bar.key}
                          style={{ cursor: 'pointer', fontSize: 12 }}
                          onClick={() => {
                            if (bar.kind === 'event') {
                              const event = eventsById.get(bar.eventId ?? '');
                              if (event) onSelectEvent(event);
                            } else {
                              const project = projectsById.get(bar.projectId);
                              if (project) onSelectDerived(project);
                            }
                          }}
                        >
                          {barLabel(bar, eventsById, projectsById)}
                        </Text>
                      ))}
                    </div>
                  }
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: token.colorTextSecondary,
                      cursor: 'pointer',
                      paddingInlineStart: 4,
                    }}
                  >
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
