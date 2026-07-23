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
const WEEKS_IN_GRID = 6;

export interface MonthGridProps {
  cursor: string;
  events: ScheduleEventDto[];
  conflictIndex: ConflictIndex;
  colorForProject: (projectId: string) => string;
  onSelectEvent: (event: ScheduleEventDto) => void;
}

export function MonthGrid({ cursor, events, conflictIndex, colorForProject, onSelectEvent }: MonthGridProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const monthStart = dayjs(cursor).startOf('month');
  const gridStart = monthStart.subtract((monthStart.day() + 6) % 7, 'day');
  const days = Array.from({ length: 7 * WEEKS_IN_GRID }, (_, index) =>
    gridStart.add(index, 'day').format('YYYY-MM-DD'),
  );

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 'none' }}>
        {WEEKDAY_KEYS.map((key) => (
          <Text
            key={key}
            type="secondary"
            style={{ padding: '4px 8px', fontSize: 12, textTransform: 'uppercase' }}
          >
            {t(`calendar.weekdays.${key}`)}
          </Text>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${WEEKS_IN_GRID}, 1fr)`,
          flex: 1,
          minHeight: 0,
        }}
      >
        {days.map((date) => {
          const isCurrentMonth = dayjs(date).month() === monthStart.month();
          const dayEvents = events.filter((event) => eventCoversDate(event, date));

          return (
            <DayCell
              key={date}
              date={date}
              muted={!isCurrentMonth}
              header={
                <Text
                  strong={date === today}
                  style={{
                    fontSize: 12,
                    color: date === today ? token.colorPrimary : token.colorText,
                  }}
                >
                  {dayjs(date).date()}
                </Text>
              }
            >
              {dayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  date={date}
                  variant="compact"
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
