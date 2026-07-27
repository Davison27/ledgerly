import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import dayjs from 'dayjs';
import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatDayTime, type ScheduleEventDto } from '@/entities/schedule-event';
import { eventContentDensity } from '../model/eventDensity';
import {
  HOUR_HEIGHT,
  HOURS_IN_DAY,
  initialScrollTop,
  segmentGeometry,
  type TimedSegment,
} from '../model/timeGrid';
import { ScheduleEventContent } from './ScheduleEventContent';
import styles from './TimeGrid.module.css';

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
    <Flex vertical className={styles.root}>
      <div ref={scrollerRef} className={styles.scroller}>
        <div className={styles.gutter}>
          {HOURS.map((hour) => (
            <div key={hour} className={styles.hourGutterRow}>
              {hour > 0 && (
                <Text type="secondary" className={styles.hourLabel}>
                  {String(hour).padStart(2, '0')}:00
                </Text>
              )}
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {weekDates.map((date, dayIndex) => (
            <div key={date} className={styles.dayColumn}>
              {HOURS.map((hour) => (
                <div key={hour} className={styles.hourDivider} />
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
                    className={styles.segment}
                    style={{
                      '--segment-top': `${geometry.top}px`,
                      '--segment-height': `${geometry.height}px`,
                      '--segment-left': `calc(${geometry.leftPercent}% + 1px)`,
                      '--segment-width': `calc(${geometry.widthPercent}% - 2px)`,
                      '--segment-bg': `${color}26`,
                      '--segment-color': color,
                    } as CSSProperties}
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
                  className={styles.nowIndicator}
                  style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Flex>
  );
}
