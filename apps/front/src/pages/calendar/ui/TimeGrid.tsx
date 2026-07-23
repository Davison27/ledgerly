import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDayTime, type ScheduleEventDto } from '@/entities/schedule-event';
import { eventContentDensity } from '../model/eventDensity';
import {
  HOUR_GUTTER_WIDTH,
  HOUR_HEIGHT,
  HOURS_IN_DAY,
  initialScrollTop,
  segmentGeometry,
  type TimedSegment,
} from '../model/timeGrid';
import { ScheduleEventContent } from './ScheduleEventContent';

const { Text } = Typography;

const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour);

function currentTimeOfDayMinutes(): number {
  const now = dayjs();
  return now.hour() * 60 + now.minute();
}

function groupSegmentsByDay(segments: TimedSegment[]): Map<number, TimedSegment[]> {
  const byDay = new Map<number, TimedSegment[]>();
  for (const segment of segments) {
    byDay.set(segment.dayIndex, [...(byDay.get(segment.dayIndex) ?? []), segment]);
  }
  return byDay;
}

export interface TimeGridProps {
  weekDates: string[];
  segments: TimedSegment[];
  eventsById: Map<string, ScheduleEventDto>;
  colorForProject: (projectId: string, color: string | null) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
}

export function TimeGrid({ weekDates, segments, eventsById, colorForProject, onSelectEvent }: TimeGridProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState(currentTimeOfDayMinutes);

  const segmentsByDay = useMemo(() => groupSegmentsByDay(segments), [segments]);
  const todayIndex = weekDates.indexOf(dayjs().format('YYYY-MM-DD'));
  const weekStart = weekDates[0];

  useEffect(() => {
    const interval = setInterval(() => setNowMinutes(currentTimeOfDayMinutes()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: initialScrollTop(segments) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  return (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      <div
        ref={scrollerRef}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', display: 'flex' }}
      >
        <div style={{ width: HOUR_GUTTER_WIDTH, flex: 'none' }}>
          {HOURS.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT, position: 'relative' }}>
              {hour > 0 && (
                <Text
                  type="secondary"
                  style={{
                    position: 'absolute',
                    top: 0,
                    insetInlineEnd: 8,
                    transform: 'translateY(-50%)',
                    fontSize: 11,
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </Text>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            height: HOURS_IN_DAY * HOUR_HEIGHT,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
          }}
        >
          {weekDates.map((date, dayIndex) => (
            <div
              key={date}
              style={{ position: 'relative', borderInlineStart: `1px solid ${token.colorBorderSecondary}` }}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: HOUR_HEIGHT, borderTop: `1px solid ${token.colorBorderSecondary}` }}
                />
              ))}

              {(segmentsByDay.get(dayIndex) ?? []).map((segment) => {
                const event = eventsById.get(segment.eventId);
                if (!event) return null;

                const geometry = segmentGeometry(segment);
                const color = colorForProject(segment.projectId, event.project.color);
                const day = event.days.find((eventDay) => eventDay.date === date);
                const scheduleLabel = day ? (formatDayTime(day) ?? '') : '';

                return (
                  <div
                    key={segment.key}
                    onClick={() => onSelectEvent(event)}
                    style={{
                      position: 'absolute',
                      top: geometry.top,
                      height: geometry.height,
                      left: `calc(${geometry.leftPercent}% + 1px)`,
                      width: `calc(${geometry.widthPercent}% - 2px)`,
                      background: `${color}26`,
                      borderInlineStart: `3px solid ${color}`,
                      borderRadius: token.borderRadiusSM,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: '2px 6px',
                    }}
                  >
                    <ScheduleEventContent
                      event={event}
                      scheduleLabel={scheduleLabel}
                      density={eventContentDensity(geometry.height, 1)}
                    />
                  </div>
                );
              })}

              {dayIndex === todayIndex && (
                <div
                  aria-label={t('calendar.week.now')}
                  style={{
                    position: 'absolute',
                    insetInline: 0,
                    top: (nowMinutes / 60) * HOUR_HEIGHT,
                    height: 2,
                    background: token.colorError,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Flex>
  );
}
