import { Avatar, Flex, Typography } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import type { SchedulableProjectDto } from '@/entities/schedule-event';
import styles from './SchedulableProjectCard.module.css';

const { Text } = Typography;

export interface SchedulableProjectCardProps {
  project: SchedulableProjectDto;
  color: string;
}

export function SchedulableProjectCard({ project, color }: SchedulableProjectCardProps) {
  return (
    <Flex align="center" gap={8} className={styles.card}>
      {project.image ? (
        <Avatar shape="square" size={30} src={project.image} />
      ) : (
        <Avatar shape="square" size={30} style={{ backgroundColor: color }} icon={<ProjectOutlined />} />
      )}
      <Flex vertical gap={0} className={styles.meta}>
        <Text ellipsis className={styles.name}>
          {project.name}
        </Text>
        <Text type="secondary" className={styles.code}>
          {project.code}
        </Text>
      </Flex>
    </Flex>
  );
}
