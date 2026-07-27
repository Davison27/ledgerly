import { Typography } from 'antd';
import type { CalendarDragData } from '../../model/dragData';
import { SchedulableProjectCard } from '../projectCard/SchedulableProjectCard';
import { StaffPanelCard } from '../staffCard/StaffPanelCard';
import styles from './CalendarDragPreview.module.css';

const { Text } = Typography;

export interface CalendarDragPreviewProps {
  data: CalendarDragData;
  colorForProject: (projectId: string, color: string | null) => string;
}

function eventLabel(data: Extract<CalendarDragData, { kind: 'event' }>): string {
  return data.event.title?.trim() || data.event.project.name;
}

export function CalendarDragPreview({ data, colorForProject }: CalendarDragPreviewProps) {
  const content = (() => {
    switch (data.kind) {
      case 'project':
      case 'derived':
        return (
          <SchedulableProjectCard
            project={data.project}
            color={colorForProject(data.project.id, data.project.color)}
          />
        );
      case 'staff':
        return <StaffPanelCard staffMember={data.staffMember} />;
      case 'event': {
        const color = colorForProject(data.event.projectId, data.event.project.color);
        return (
          <div className={styles.eventPreview} style={{ borderInlineStartColor: color }}>
            <Text className={styles.eventLabel}>{eventLabel(data)}</Text>
          </div>
        );
      }
      case 'resize':
        return null;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return <div className={styles.wrapper}>{content}</div>;
}
