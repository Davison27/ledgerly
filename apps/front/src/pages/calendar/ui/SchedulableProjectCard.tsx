import { Avatar, Flex, Typography, theme } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import type { SchedulableProjectDto } from '@/entities/schedule-event';

const { Text } = Typography;

export interface SchedulableProjectCardProps {
  project: SchedulableProjectDto;
  color: string;
}

export function SchedulableProjectCard({ project, color }: SchedulableProjectCardProps) {
  const { token } = theme.useToken();

  return (
    <Flex
      align="center"
      gap={8}
      style={{
        padding: '6px 8px',
        borderRadius: token.borderRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {project.image ? (
        <Avatar shape="square" size={22} src={project.image} />
      ) : (
        <Avatar shape="square" size={22} style={{ backgroundColor: color }} icon={<ProjectOutlined />} />
      )}
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <Text ellipsis style={{ fontSize: 13 }}>
          {project.name}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {project.code}
        </Text>
      </Flex>
    </Flex>
  );
}
