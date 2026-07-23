import dayjs from 'dayjs';
import { Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleEventDto } from '@/entities/schedule-event';
import { eventCoversDate } from '@/entities/schedule-event';
import type { ConflictIndex } from '../model/conflictIndex';
import { conflictsForEventOnDate } from '../model/conflictIndex';
import { DayCell } from './DayCell';
import { EventCard } from './EventCard';

const { Text } = Typography;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export interface WeekGridProps {
  cursor: string;
  events: ScheduleEventDto[];
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
}

export function WeekGrid({ cursor, events, conflictIndex, colorForProject, onSelectEvent }: WeekGridProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const monday = dayjs(cursor).subtract((dayjs(cursor).day() + 6) % 7, 'day');
  const days = Array.from({ length: 7 }, (_, index) => monday.add(index, 'day').format('YYYY-MM-DD'));
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 'none' }}>
        {days.map((date, index) => (
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          flex: 1,
          minHeight: 0,
        }}
      >
        {days.map((date) => {
          const dayEvents = events.filter((event) => eventCoversDate(event, date));

          return (
            <DayCell key={date} date={date} header={null}>
              {dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  date={date}
                  variant="detailed"
                  color={colorForProject(event.projectId)}
                  conflicts={conflictsForEventOnDate(conflictIndex, event.id, date)}
                  onSelect={onSelectEvent}
                />
              ))}
            </DayCell>
          );
        })}
      </div>
    </div>
  );
}
