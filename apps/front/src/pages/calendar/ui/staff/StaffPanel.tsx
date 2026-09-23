import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Empty, Flex, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { CalendarStaffOption } from '../../model/calendarEditorData';
import type { StaffDragData } from '../../model/dragData';
import { StaffPanelCard } from '../staffCard/StaffPanelCard';
import styles from './StaffPanel.module.css';

const { Text } = Typography;

interface StaffPanelItemProps {
  staffMember: CalendarStaffOption;
  canAssign: boolean;
}

function StaffPanelItem({ staffMember, canAssign }: StaffPanelItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `staff-${staffMember.id}`,
    disabled: !canAssign,
    data: {
      kind: 'staff',
      staffMemberId: staffMember.id,
      name: staffMember.displayName,
    } satisfies StaffDragData,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={styles.draggableItem} data-dragging={isDragging}>
      <StaffPanelCard staffMember={staffMember} />
    </div>
  );
}

export interface StaffPanelProps {
  staffMembers: CalendarStaffOption[];
  canAssign: boolean;
}

export function StaffPanel({ staffMembers, canAssign }: StaffPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = staffMembers.filter(
    (staffMember) =>
      !search.trim() ||
      staffMember.displayName.toLowerCase().includes(search.trim().toLowerCase()),
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
          filtered.map((staffMember) => (
            <StaffPanelItem
              key={staffMember.id}
              staffMember={staffMember}
              canAssign={canAssign}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
