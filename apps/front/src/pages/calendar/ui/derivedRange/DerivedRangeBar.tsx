import { useDraggable } from '@dnd-kit/core';
import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import type { DerivedProjectDragData } from '../../model/dragData';
import styles from './DerivedRangeBar.module.css';

const { Text } = Typography;

export interface DerivedRangeBarProps {
  project: SchedulableProjectDto;
  rowKey: string;
  color: string;
  onSelect: (project: SchedulableProjectDto) => void;
}

export function DerivedRangeBar({ project, rowKey, color, onSelect }: DerivedRangeBarProps) {
  const { t } = useTranslation();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `derived-drag-${project.id}-${rowKey}`,
    data: { kind: 'derived', project } satisfies DerivedProjectDragData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(project)}
      className={styles.bar}
      data-dragging={isDragging}
      style={{ borderColor: color }}
    >
      <Text ellipsis className={styles.label} style={{ color }}>
        {project.name}
      </Text>
      <Tag className={styles.badge}>{t('calendar.derived.badge')}</Tag>
    </div>
  );
}
