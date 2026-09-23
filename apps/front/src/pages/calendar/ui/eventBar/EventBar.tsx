import type { CSSProperties } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Avatar, Flex, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleConflictDto } from '@/entities/schedule-event';
import { summarizeDayTimes } from '@/entities/schedule-event';
import { hasErrorConflict, hasInfoConflict } from '../../model/conflictIndex';
import type { EventDragData, EventDropData, ResizeDragData } from '../../model/dragData';
import { eventContentDensity, WEEK_BAR_HEIGHT } from '../../model/eventDensity';
import { staffDisplay } from '../../model/staffDisplay';
import type { CalendarEvent } from '../../model/calendarEditorData';
import { ScheduleEventContent } from '../eventContent/ScheduleEventContent';
import styles from './EventBar.module.css';

const { Text } = Typography;

export interface EventBarProps {
  event: CalendarEvent;
  barKey: string;
  rowKey: string;
  segmentStart: string;
  segmentEnd: string;
  ownsStartHandle: boolean;
  ownsEndHandle: boolean;
  span: number;
  variant: 'month' | 'week';
  color: string;
  conflicts: ScheduleConflictDto[];
  onSelect: (event: CalendarEvent) => void;
}

export function EventBar({
  event,
  barKey,
  rowKey,
  segmentStart,
  segmentEnd,
  ownsStartHandle,
  ownsEndHandle,
  span,
  variant,
  color,
  conflicts,
  onSelect,
}: EventBarProps) {
  const { t } = useTranslation();
  const instanceKey = `${barKey}-${rowKey}`;

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `event-drop-${instanceKey}`,
    data: { kind: 'event', eventId: event.id } satisfies EventDropData,
  });

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-drag-${instanceKey}`,
    data: { kind: 'event', event, date: segmentStart } satisfies EventDragData,
  });

  const startHandle = useDraggable({
    id: `resize-start-${instanceKey}`,
    data: { kind: 'resize', event, edge: 'start' } satisfies ResizeDragData,
  });

  const endHandle = useDraggable({
    id: `resize-end-${instanceKey}`,
    data: { kind: 'resize', event, edge: 'end' } satisfies ResizeDragData,
  });

  const isInactive = event.project.status !== undefined && event.project.status !== 'active';
  const hasError = hasErrorConflict(conflicts);
  const hasInfo = hasInfoConflict(conflicts);
  const title = event.title?.trim() || event.project.displayName;
  const borderColor = hasError ? 'var(--ant-color-error)' : hasInfo ? 'var(--ant-color-warning)' : 'transparent';
  const segmentDays = event.days.filter((day) => day.date >= segmentStart && day.date <= segmentEnd);

  const monthStaff = staffDisplay(event.staff, 3);
  const monthStaffNames = event.staff.map((member) => member.displayName).join(', ');

  const daySummary = segmentDays.length > 0 ? summarizeDayTimes(segmentDays) : null;
  const scheduleLabel =
    daySummary?.kind === 'mixed'
      ? t('calendar.days.mixedTimes')
      : (daySummary?.label ?? t('calendar.days.fullDay'));

  return (
    <Flex ref={setDropRef} align="stretch" gap={2} className={styles.row} data-over={isOver}>
      {ownsStartHandle && (
        <div
          ref={startHandle.setNodeRef}
          {...startHandle.listeners}
          {...startHandle.attributes}
          role="slider"
          aria-label={t('calendar.event.resizeStart')}
          className={styles.handle}
        />
      )}

      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onSelect(event)}
        className={styles.content}
        style={{
          '--bar-bg': `${color}${isInactive ? '40' : '26'}`,
          '--bar-color': color,
          '--bar-border-color': borderColor,
        } as CSSProperties}
        data-variant={variant}
        data-owns-start={ownsStartHandle}
        data-owns-end={ownsEndHandle}
        data-dragging={isDragging}
      >
        {variant === 'month' && (
          <Flex align="center" gap={4} wrap justify="space-between" className={styles.monthHeader}>
            <Flex align="center" gap={4} wrap className={styles.monthTitleGroup}>
              <Text ellipsis className={styles.monthTitle}>
                {title}
              </Text>
              {isInactive && event.project.status && (
                <Tag className={styles.monthStatusTag}>
                  {t(`projects.form.statuses.${event.project.status}`)}
                </Tag>
              )}
            </Flex>
            {span >= 2 && event.staff.length > 0 && (
              <Tooltip title={monthStaffNames}>
                <Flex flex="none">
                  {monthStaff.visible.map((staffMember) => (
                    <div key={staffMember.id} className={styles.monthStaffAvatar}>
                      <Avatar size={18}>{staffMember.displayName.slice(0, 1)}</Avatar>
                    </div>
                  ))}
                  {monthStaff.hidden.length > 0 && (
                    <Text className={styles.monthHiddenCount}>+{monthStaff.hidden.length}</Text>
                  )}
                </Flex>
              </Tooltip>
            )}
          </Flex>
        )}

        {variant === 'week' && (
          <ScheduleEventContent
            event={event}
            scheduleLabel={scheduleLabel}
            density={eventContentDensity(WEEK_BAR_HEIGHT, span)}
          />
        )}
      </div>

      {ownsEndHandle && (
        <div
          ref={endHandle.setNodeRef}
          {...endHandle.listeners}
          {...endHandle.attributes}
          role="slider"
          aria-label={t('calendar.event.resizeEnd')}
          className={styles.handle}
        />
      )}
    </Flex>
  );
}
