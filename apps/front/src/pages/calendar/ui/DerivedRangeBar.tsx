import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import type { DerivedProjectDragData } from '../model/dragData';

const { Text } = Typography;

export interface DerivedRangeBarProps {
  project: SchedulableProjectDto;
  rowKey: string;
  color: string;
  onSelect: (project: SchedulableProjectDto) => void;
}

export function DerivedRangeBar({ project, rowKey, color, onSelect }: DerivedRangeBarProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `derived-drag-${project.id}-${rowKey}`,
    data: { kind: 'derived', project } satisfies DerivedProjectDragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(project)}
      style={{
        transform: CSS.Translate.toString(transform),
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        minWidth: 0,
        padding: '2px 6px',
        borderRadius: token.borderRadiusSM,
        border: `1px dashed ${color}`,
        opacity: isDragging ? 0.4 : 0.7,
        cursor: 'grab',
        overflow: 'hidden',
      }}
    >
      <Text ellipsis style={{ fontSize: 12, color }}>
        {project.name}
      </Text>
      <Tag style={{ fontSize: 10, marginInlineEnd: 0, flex: 'none' }}>{t('calendar.derived.badge')}</Tag>
    </div>
  );
}
