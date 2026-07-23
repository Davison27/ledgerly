import { Flex, Typography } from 'antd';
import { StaffAvatar, type StaffMemberDto } from '@/entities/staff-member';

const { Text } = Typography;

export interface StaffPanelCardProps {
  staffMember: StaffMemberDto;
}

export function StaffPanelCard({ staffMember }: StaffPanelCardProps) {
  return (
    <Flex vertical align="center" gap={4} style={{ width: 88, padding: 6 }}>
      <StaffAvatar staffMember={staffMember} size={48} />
      <Text ellipsis style={{ fontSize: 12, maxWidth: 80, textAlign: 'center' }}>
        {staffMember.firstName} {staffMember.lastName}
      </Text>
    </Flex>
  );
}
