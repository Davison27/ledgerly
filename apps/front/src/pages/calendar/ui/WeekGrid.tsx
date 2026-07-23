import dayjs from 'dayjs';
import { Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { ConflictIndex } from '../model/conflictIndex';
import type { LaneItem } from '../model/lanes';
import { WeekRow } from './WeekRow';

const { Text } = Typography;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export interface WeekGridProps {
  cursor: string;
  items: LaneItem[];
  eventsById: Map<string, ScheduleEventDto>;
  projectsById: Map<string, SchedulableProjectDto>;
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string, color: string | null) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
  onSelectDerived: (project: SchedulableProjectDto) => void;
}

export function WeekGrid({
  cursor,
  items,
  eventsById,
  projectsById,
  conflictIndex,
  colorForProject,
  onSelectEvent,
  onSelectDerived,
}: WeekGridProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const monday = dayjs(cursor).subtract((dayjs(cursor).day() + 6) % 7, 'day');
  const weekDates = Array.from({ length: 7 }, (_, index) => monday.add(index, 'day').format('YYYY-MM-DD'));
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 'none' }}>
        {weekDates.map((date, index) => (
          <Text
            key={date}
            strong={date === today}
            type={date === today ? undefined : 'secondary'}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              color: date === today ? token.colorPrimary : undefined,
            }}
          >
            {t(`calendar.weekdays.${WEEKDAY_KEYS[index]}`)} · {dayjs(date).date()}
          </Text>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <WeekRow
          weekDates={weekDates}
          dayHeaders={weekDates.map(() => null)}
          items={items}
          eventsById={eventsById}
          projectsById={projectsById}
          conflictIndex={conflictIndex}
          colorForProject={colorForProject}
          variant="week"
          onSelectEvent={onSelectEvent}
          onSelectDerived={onSelectDerived}
        />
      </div>
    </Flex>
  );
}
