import { Typography, theme } from 'antd';
import type { CalendarDragData } from '../model/dragData';
import { SchedulableProjectCard } from './SchedulableProjectCard';
import { StaffPanelCard } from './StaffPanelCard';

const { Text } = Typography;

export interface CalendarDragPreviewProps {
  data: CalendarDragData;
  colorForProject: (projectId: string, color: string | null) => string;
}

function eventLabel(data: Extract<CalendarDragData, { kind: 'event' }>): string {
  return data.event.title?.trim() || data.event.project.name;
}

export function CalendarDragPreview({ data, colorForProject }: CalendarDragPreviewProps) {
  const { token } = theme.useToken();

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
          <div
            style={{
              padding: '4px 10px',
              background: token.colorBgElevated,
              borderInlineStart: `3px solid ${color}`,
              borderRadius: token.borderRadiusSM,
            }}
          >
            <Text style={{ fontSize: 13 }}>{eventLabel(data)}</Text>
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

  return <div style={{ width: 'fit-content' }}>{content}</div>;
}
