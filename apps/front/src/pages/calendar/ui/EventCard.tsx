import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Flex, Tag, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleConflictDto, ScheduleEventDto } from '@/entities/schedule-event';
import { formatDayTime } from '@/entities/schedule-event';
import { hasErrorConflict, hasInfoConflict } from '../model/conflictIndex';
import type { EventDragData, ResizeDragData } from '../model/dragData';

const { Text } = Typography;

export interface EventCardProps {
  event: ScheduleEventDto;
  date: string;
  color: string;
  conflicts: ScheduleConflictDto[];
  variant: 'compact' | 'detailed';
  onSelect: (event: ScheduleEventDto) => void;
}

export function EventCard({ event, date, color, conflicts, variant, onSelect }: EventCardProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${event.id}-${date}`,
    data: { kind: 'event', event, date } satisfies EventDragData,
  });

  const startHandle = useDraggable({
    id: `resize-start-${event.id}-${date}`,
    data: { kind: 'resize', event, edge: 'start' } satisfies ResizeDragData,
  });

  const endHandle = useDraggable({
    id: `resize-end-${event.id}-${date}`,
    data: { kind: 'resize', event, edge: 'end' } satisfies ResizeDragData,
  });

  const day = event.days.find((candidate) => candidate.date === date);
  const isInactive = event.project.status !== 'active';
  const hasError = hasErrorConflict(conflicts);
  const hasInfo = hasInfoConflict(conflicts);
  const title = event.title?.trim() || event.project.name;

  const borderColor = hasError
    ? token.colorError
    : hasInfo
      ? token.colorWarning
      : 'transparent';

  const cardStyle = {
    transform: CSS.Translate.toString(transform),
    flex: 1,
    minWidth: 0,
    background: `${color}${isInactive ? '40' : '26'}`,
    borderInlineStart: `3px solid ${color}`,
    borderBlock: `1px solid ${borderColor}`,
    borderInlineEnd: `1px solid ${borderColor}`,
    opacity: isDragging ? 0.5 : 1,
    borderRadius: token.borderRadiusSM,
    padding: variant === 'compact' ? '2px 6px' : '6px 8px',
    cursor: 'grab',
  };

  const handleStyle = {
    width: 6,
    flex: 'none' as const,
    cursor: 'ew-resize',
    borderRadius: token.borderRadiusSM,
    background: token.colorFillSecondary,
  };

  return (
    <Flex align="stretch" gap={2}>
      {date === event.startDate && (
        <div
          ref={startHandle.setNodeRef}
          {...startHandle.listeners}
          {...startHandle.attributes}
          role="slider"
          aria-label={t('calendar.event.resizeStart')}
          style={handleStyle}
        />
      )}

      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={cardStyle}
        onClick={() => onSelect(event)}
      >
        <Flex vertical gap={2}>
          <Flex align="center" gap={4} wrap>
            <Text ellipsis style={{ fontSize: variant === 'compact' ? 12 : 13, fontWeight: 500 }}>
              {title}
            </Text>
            {isInactive && (
              <Tag style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
                {t(`projects.form.statuses.${event.project.status}`)}
              </Tag>
            )}
          </Flex>

          {variant === 'detailed' && (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {day ? (formatDayTime(day) ?? t('calendar.days.fullDay')) : ''}
              </Text>
              {event.staff.length > 0 && (
                <Flex gap={4} wrap>
                  {event.staff.map((staffMember) => (
                    <Tag key={staffMember.id} style={{ fontSize: 11, marginInlineEnd: 0 }}>
                      {staffMember.firstName} {staffMember.lastName}
                    </Tag>
                  ))}
                </Flex>
              )}
              {event.products.length > 0 && (
                <Flex gap={4} wrap>
                  {event.products.map((product) => (
                    <Tag key={product.productId} color="blue" style={{ fontSize: 11, marginInlineEnd: 0 }}>
                      {product.name} ×{product.quantity}
                    </Tag>
                  ))}
                </Flex>
              )}
            </>
          )}
        </Flex>
      </div>

      {date === event.endDate && (
        <div
          ref={endHandle.setNodeRef}
          {...endHandle.listeners}
          {...endHandle.attributes}
          role="slider"
          aria-label={t('calendar.event.resizeEnd')}
          style={handleStyle}
        />
      )}
    </Flex>
  );
}
