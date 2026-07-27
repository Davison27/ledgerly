import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Empty, Flex, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { StaffMemberDto } from '@/entities/staff-member';
import type { StaffDragData } from '../model/dragData';
import { StaffPanelCard } from './StaffPanelCard';
import styles from './StaffPanel.module.css';

const { Text } = Typography;

interface StaffPanelItemProps {
  staffMember: StaffMemberDto;
}

function StaffPanelItem({ staffMember }: StaffPanelItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staffMember.id}`,
    data: {
      kind: 'staff',
      staffMemberId: staffMember.id,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      staffMember,
    } satisfies StaffDragData,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={styles.draggableItem} data-dragging={isDragging}>
      <StaffPanelCard staffMember={staffMember} />
    </div>
  );
}

export interface StaffPanelProps {
  staffMembers: StaffMemberDto[];
}

export function StaffPanel({ staffMembers }: StaffPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = staffMembers.filter(
    (staffMember) =>
      !search.trim() ||
      `${staffMember.firstName} ${staffMember.lastName}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Flex vertical gap={8} className={styles.panel}>
      <Text strong className={styles.title}>
        {t('calendar.staffPanel.title')}
      </Text>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={t('calendar.staffPanel.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Flex wrap gap={8} className={styles.list}>
        {filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('calendar.staffPanel.empty')} />
        ) : (
          filtered.map((staffMember) => <StaffPanelItem key={staffMember.id} staffMember={staffMember} />)
        )}
      </Flex>
    </Flex>
  );
}
