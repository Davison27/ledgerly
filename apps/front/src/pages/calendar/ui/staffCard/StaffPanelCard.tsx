import { Avatar, Flex, Typography } from 'antd';
import type { CalendarStaffOption } from '../../model/calendarEditorData';
import styles from './StaffPanelCard.module.css';

const { Text } = Typography;

export interface StaffPanelCardProps {
  staffMember: CalendarStaffOption;
}

export function StaffPanelCard({ staffMember }: StaffPanelCardProps) {
  return (
    <Flex vertical align="center" gap={2} className={styles.card}>
      <Avatar size={40}>{staffMember.displayName.slice(0, 1)}</Avatar>
      <Text ellipsis className={styles.name}>
        {staffMember.displayName}
      </Text>
    </Flex>
  );
}
