import { Avatar, Flex, Typography } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import type { CalendarProjectOption } from '../../model/calendarEditorData';
import styles from './SchedulableProjectCard.module.css';

const { Text } = Typography;

export interface SchedulableProjectCardProps {
  project: CalendarProjectOption;
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
          {project.displayName}
        </Text>
        {project.code && (
          <Text type="secondary" className={styles.code}>
            {project.code}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
