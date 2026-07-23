import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto, ScheduleEventDto } from '@/entities/schedule-event';
import type { ConflictIndex } from '../model/conflictIndex';
import type { LaneItem } from '../model/lanes';
import { HOUR_GUTTER_WIDTH, buildTimedSegments } from '../model/timeGrid';
import { WeekRow } from './WeekRow';
import { TimeGrid } from './TimeGrid';

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

  const segments = useMemo(
    () => buildTimedSegments([...eventsById.values()], weekDates),
    [eventsById, weekDates],
  );

  return (
    <Flex vertical style={{ height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', flex: 'none' }}>
        <div style={{ width: HOUR_GUTTER_WIDTH, flex: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, minWidth: 0 }}>
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
      </div>

      <div style={{ display: 'flex', flex: '0 0 auto', minHeight: 0, maxHeight: '50%' }}>
        <Flex
          align="flex-start"
          justify="flex-end"
          style={{
            width: HOUR_GUTTER_WIDTH,
            flex: 'none',
            padding: '4px 8px',
            borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t('calendar.week.allDay')}
          </Text>
        </Flex>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            scrollbarGutter: 'stable',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
      </div>

      <div
        style={{
          flex: '1 1 auto',
          minHeight: 220,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
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
