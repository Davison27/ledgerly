import dayjs from 'dayjs';
import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { ConflictIndex } from '../model/conflictIndex';
import type { LaneItem } from '../model/lanes';
import { WeekRow } from './WeekRow';
import styles from './MonthGrid.module.css';

const { Text } = Typography;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const WEEKS_IN_GRID = 6;

export interface MonthGridProps {
  cursor: string;
  items: LaneItem[];
  eventsById: Map<string, ScheduleEventDto>;
  projectsById: Map<string, SchedulableProjectDto>;
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string, color: string | null) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
  onSelectDerived: (project: SchedulableProjectDto) => void;
}

export function MonthGrid({
  cursor,
  items,
  eventsById,
  projectsById,
  conflictIndex,
  colorForProject,
  onSelectEvent,
  onSelectDerived,
}: MonthGridProps) {
  const { t } = useTranslation();

  const monthStart = dayjs(cursor).startOf('month');
  const gridStart = monthStart.subtract((monthStart.day() + 6) % 7, 'day');
  const today = dayjs().format('YYYY-MM-DD');

  const weeks = Array.from({ length: WEEKS_IN_GRID }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      gridStart.add(weekIndex * 7 + dayIndex, 'day').format('YYYY-MM-DD'),
    ),
  );

  return (
    <Flex vertical className={styles.root}>
      <div className={styles.weekdayRow}>
        {WEEKDAY_KEYS.map((key) => (
          <Text key={key} type="secondary" className={styles.weekdayLabel}>
            {t(`calendar.weekdays.${key}`)}
          </Text>
        ))}
      </div>
      <div className={styles.weeksScroller}>
        {weeks.map((weekDates) => (
          <WeekRow
            key={weekDates[0]}
            weekDates={weekDates}
            dayHeaders={weekDates.map((date) => (
              <Text key={date} strong={date === today} className={styles.dayHeaderLabel} data-today={date === today}>
                {dayjs(date).date()}
              </Text>
            ))}
            mutedDays={weekDates.map((date) => dayjs(date).month() !== monthStart.month())}
            items={items}
            eventsById={eventsById}
            projectsById={projectsById}
            conflictIndex={conflictIndex}
            colorForProject={colorForProject}
            variant="month"
            onSelectEvent={onSelectEvent}
            onSelectDerived={onSelectDerived}
          />
        ))}
      </div>
    </Flex>
  );
}
