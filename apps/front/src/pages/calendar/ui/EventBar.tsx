import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Flex, Tag, Tooltip, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleConflictDto, ScheduleEventDto } from '@/entities/schedule-event';
import { summarizeDayTimes } from '@/entities/schedule-event';
import { StaffAvatar } from '@/entities/staff-member';
import { hasErrorConflict, hasInfoConflict } from '../model/conflictIndex';
import type { EventDragData, EventDropData, ResizeDragData } from '../model/dragData';
import { eventContentDensity, WEEK_BAR_HEIGHT } from '../model/eventDensity';
import { staffDisplay } from '../model/staffDisplay';
import { ScheduleEventContent } from './ScheduleEventContent';

const { Text } = Typography;

export interface EventBarProps {
  event: ScheduleEventDto;
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
  onSelect: (event: ScheduleEventDto) => void;
}

const HANDLE_STYLE = {
  width: 6,
  flex: 'none' as const,
  cursor: 'ew-resize',
};

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
  const { token } = theme.useToken();
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

  const isInactive = event.project.status !== 'active';
  const hasError = hasErrorConflict(conflicts);
  const hasInfo = hasInfoConflict(conflicts);
  const title = event.title?.trim() || event.project.name;
  const borderColor = hasError ? token.colorError : hasInfo ? token.colorWarning : 'transparent';
  const segmentDays = event.days.filter((day) => day.date >= segmentStart && day.date <= segmentEnd);

  const monthStaff = staffDisplay(event.staff, 3);
  const monthStaffNames = event.staff.map((member) => `${member.firstName} ${member.lastName}`).join(', ');

  const daySummary = segmentDays.length > 0 ? summarizeDayTimes(segmentDays) : null;
  const scheduleLabel =
    daySummary?.kind === 'mixed'
      ? t('calendar.days.mixedTimes')
      : (daySummary?.label ?? t('calendar.days.fullDay'));

  return (
    <Flex
      ref={setDropRef}
      align="stretch"
      gap={2}
      style={{ height: '100%', background: isOver ? token.colorPrimaryBgHover : undefined }}
    >
      {ownsStartHandle && (
        <div
          ref={startHandle.setNodeRef}
          {...startHandle.listeners}
          {...startHandle.attributes}
          role="slider"
          aria-label={t('calendar.event.resizeStart')}
          style={{ ...HANDLE_STYLE, borderRadius: token.borderRadiusSM, background: token.colorFillSecondary }}
        />
      )}

      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={() => onSelect(event)}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: variant === 'week' ? 'flex-start' : 'center',
          gap: 2,
          background: `${color}${isInactive ? '40' : '26'}`,
          borderInlineStart: `${ownsStartHandle ? 3 : 1}px solid ${color}`,
          borderBlock: `1px solid ${borderColor}`,
          borderInlineEnd: `1px solid ${ownsEndHandle ? borderColor : color}`,
          borderStartStartRadius: ownsStartHandle ? token.borderRadiusSM : 0,
          borderEndStartRadius: ownsStartHandle ? token.borderRadiusSM : 0,
          borderStartEndRadius: ownsEndHandle ? token.borderRadiusSM : 0,
          borderEndEndRadius: ownsEndHandle ? token.borderRadiusSM : 0,
          opacity: isDragging ? 0.5 : 1,
          padding: variant === 'month' ? '2px 6px' : '6px 8px',
          cursor: 'grab',
          overflow: 'hidden',
        }}
      >
        {variant === 'month' && (
          <Flex align="center" gap={4} wrap justify="space-between" style={{ flex: 'none' }}>
            <Flex align="center" gap={4} wrap style={{ minWidth: 0 }}>
              <Text ellipsis style={{ fontSize: 12, fontWeight: 500 }}>
                {title}
              </Text>
              {isInactive && (
                <Tag style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
                  {t(`projects.form.statuses.${event.project.status}`)}
                </Tag>
              )}
            </Flex>
            {span >= 2 && event.staff.length > 0 && (
              <Tooltip title={monthStaffNames}>
                <Flex flex="none">
                  {monthStaff.visible.map((staffMember, index) => (
                    <div key={staffMember.id} style={{ marginInlineStart: index === 0 ? 0 : -6 }}>
                      <StaffAvatar staffMember={staffMember} size={18} />
                    </div>
                  ))}
                  {monthStaff.hidden.length > 0 && (
                    <Text style={{ fontSize: 10, marginInlineStart: 2 }}>+{monthStaff.hidden.length}</Text>
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
          style={{ ...HANDLE_STYLE, borderRadius: token.borderRadiusSM, background: token.colorFillSecondary }}
        />
      )}
    </Flex>
  );
}
