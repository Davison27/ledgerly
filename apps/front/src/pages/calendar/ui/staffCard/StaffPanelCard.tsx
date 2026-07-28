import { Flex, Typography } from 'antd';
import { StaffAvatar, type StaffMemberDto } from '@/entities/staff-member';
import styles from './StaffPanelCard.module.css';

const { Text } = Typography;

export interface StaffPanelCardProps {
  staffMember: StaffMemberDto;
}

export function StaffPanelCard({ staffMember }: StaffPanelCardProps) {
  return (
    <Flex vertical align="center" gap={2} className={styles.card}>
      <StaffAvatar staffMember={staffMember} size={40} />
      <Text ellipsis className={styles.name}>
        {staffMember.firstName} {staffMember.lastName}
      </Text>
    </Flex>
  );
}
