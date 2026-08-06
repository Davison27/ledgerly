import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import dayjs from 'dayjs';
import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';
import type { ConflictIndex } from '../../model/conflictIndex';
import type { LaneItem } from '../../model/lanes';
import {
  buildTimedSegments,
  HOUR_GUTTER_WIDTH,
  HOUR_HEIGHT,
  HOURS_IN_DAY,
} from '../../model/timeGrid';
import { WeekRow } from '../weekRow/WeekRow';
import { TimeGrid } from '../timeGrid/TimeGrid';
import styles from './WeekGrid.module.css';

const { Text } = Typography;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export interface WeekGridProps {
  cursor: string;
  items: LaneItem[];
  eventsById: Map<string, ScheduleEventDto>;
  deadlinesById: Map<string, TaxDeadlineDto>;
  projectsById: Map<string, SchedulableProjectDto>;
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string, color: string | null) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
  onSelectTaxDeadline: (deadline: TaxDeadlineDto) => void;
  onSelectDerived: (project: SchedulableProjectDto) => void;
}

export function WeekGrid({
  cursor,
  items,
  eventsById,
  deadlinesById,
  projectsById,
  conflictIndex,
  colorForProject,
  onSelectEvent,
  onSelectTaxDeadline,
  onSelectDerived,
}: WeekGridProps) {
  const { t } = useTranslation();

  const monday = dayjs(cursor).subtract((dayjs(cursor).day() + 6) % 7, 'day');
  const weekDates = Array.from({ length: 7 }, (_, index) =>
    monday.add(index, 'day').format('YYYY-MM-DD'),
  );
  const today = dayjs().format('YYYY-MM-DD');

  const segments = useMemo(
    () => buildTimedSegments([...eventsById.values()], weekDates),
    [eventsById, weekDates],
  );

  return (
    <Flex
      vertical
      className={styles.root}
      style={
        {
          '--hour-height': `${HOUR_HEIGHT}px`,
          '--hour-gutter-width': `${HOUR_GUTTER_WIDTH}px`,
          '--hours-in-day': HOURS_IN_DAY,
        } as CSSProperties
      }
    >
      <div className={styles.headerRow}>
        <div className={styles.headerGutter} />
        <div className={styles.headerDays}>
          {weekDates.map((date, index) => (
            <Text
              key={date}
              strong={date === today}
              type={date === today ? undefined : 'secondary'}
              className={styles.weekdayHeaderLabel}
              data-today={date === today}
            >
              {t(`calendar.weekdays.${WEEKDAY_KEYS[index]}`)} · {dayjs(date).date()}
            </Text>
          ))}
        </div>
      </div>

      <div className={styles.allDayRow}>
        <Flex align="flex-start" justify="flex-end" className={styles.allDayGutter}>
          <Text type="secondary" className={styles.allDayLabel}>
            {t('calendar.week.allDay')}
          </Text>
        </Flex>
        <div className={styles.allDayScroller}>
          <WeekRow
            weekDates={weekDates}
            dayHeaders={weekDates.map(() => null)}
            items={items}
            eventsById={eventsById}
            deadlinesById={deadlinesById}
            projectsById={projectsById}
            conflictIndex={conflictIndex}
            colorForProject={colorForProject}
            variant="week"
            onSelectEvent={onSelectEvent}
            onSelectTaxDeadline={onSelectTaxDeadline}
            onSelectDerived={onSelectDerived}
          />
        </div>
      </div>

      <div className={styles.timeGridWrapper}>
        <TimeGrid
          weekDates={weekDates}
          segments={segments}
          eventsById={eventsById}
          colorForProject={colorForProject}
          onSelectEvent={onSelectEvent}
        />
      </div>
    </Flex>
  );
}
