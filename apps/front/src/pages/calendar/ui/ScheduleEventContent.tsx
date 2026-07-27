import { Flex, Tag, Tooltip, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleEventDto } from '@/entities/schedule-event';
import { StaffAvatar } from '@/entities/staff-member';
import { staffDisplay } from '../model/staffDisplay';
import type { EventContentDensity } from '../model/eventDensity';
import styles from './ScheduleEventContent.module.css';

const { Text } = Typography;

export interface ScheduleEventContentProps {
  event: ScheduleEventDto;
  scheduleLabel: string;
  density: EventContentDensity;
}

export function ScheduleEventContent({ event, scheduleLabel, density }: ScheduleEventContentProps) {
  const { t } = useTranslation();

  const isInactive = event.project.status !== 'active';
  const title = event.title?.trim() || event.project.name;

  const staff = staffDisplay(event.staff, density.maxStaff);
  const staffNames = event.staff.map((member) => `${member.firstName} ${member.lastName}`).join(', ');

  const visibleProducts = event.products.slice(0, density.maxProducts);
  const hiddenProducts = event.products.slice(density.maxProducts);

  const staffContent =
    density.staffMode === 'chips' ? (
      <Flex align="center" gap={6} wrap>
        {staff.visible.map((staffMember) => (
          <Flex key={staffMember.id} align="center" gap={6} className={styles.chip}>
            <StaffAvatar staffMember={staffMember} size={24} />
            <Text className={styles.chipName}>
              {staffMember.firstName} {staffMember.lastName}
            </Text>
          </Flex>
        ))}
        {staff.hidden.length > 0 && <Text className={styles.hiddenCount}>+{staff.hidden.length}</Text>}
      </Flex>
    ) : (
      <Flex align="center" gap={6}>
        <Flex>
          {staff.visible.map((staffMember) => (
            <div key={staffMember.id} className={styles.avatarOverlap}>
              <StaffAvatar staffMember={staffMember} size={24} />
            </div>
          ))}
        </Flex>
        {staff.hidden.length > 0 && <Text className={styles.hiddenCount}>+{staff.hidden.length}</Text>}
      </Flex>
    );

  return (
    <>
      <Flex flex="none" align="center" gap={4} wrap>
        <Flex align="center" gap={4} wrap className={styles.titleGroup}>
          <Text ellipsis className={styles.title}>
            {title}
          </Text>
          {isInactive && (
            <Tag className={styles.statusTag}>{t(`projects.form.statuses.${event.project.status}`)}</Tag>
          )}
        </Flex>
      </Flex>

      {density.showSchedule && (
        <Flex flex="none">
          <Text type="secondary" className={styles.scheduleLabel}>
            {scheduleLabel}
          </Text>
        </Flex>
      )}

      {density.staffMode !== 'none' && event.staff.length > 0 && (
        <Flex flex="none">
          {staff.hidden.length > 0 ? <Tooltip title={staffNames}>{staffContent}</Tooltip> : staffContent}
        </Flex>
      )}

      {density.maxProducts > 0 && event.products.length > 0 && (
        <Flex flex="none" gap={4} wrap>
          {visibleProducts.map((product) => (
            <Tag key={product.productId} color="blue" className={styles.productTag}>
              {product.name} ×{product.quantity}
            </Tag>
          ))}
          {hiddenProducts.length > 0 && (
            <Tooltip title={hiddenProducts.map((product) => `${product.name} ×${product.quantity}`).join(', ')}>
              <Tag className={styles.productTag}>+{hiddenProducts.length}</Tag>
            </Tooltip>
          )}
        </Flex>
      )}
    </>
  );
}
