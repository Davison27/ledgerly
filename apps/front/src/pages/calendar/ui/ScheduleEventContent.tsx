import { Flex, Tag, Tooltip, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ScheduleEventDto } from '@/entities/schedule-event';
import { StaffAvatar } from '@/entities/staff-member';
import { staffDisplay } from '../model/staffDisplay';
import type { EventContentDensity } from '../model/eventDensity';

const { Text } = Typography;

export interface ScheduleEventContentProps {
  event: ScheduleEventDto;
  scheduleLabel: string;
  density: EventContentDensity;
}

export function ScheduleEventContent({ event, scheduleLabel, density }: ScheduleEventContentProps) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

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
          <Flex
            key={staffMember.id}
            align="center"
            gap={6}
            style={{
              background: token.colorBgContainer,
              borderRadius: 999,
              padding: '1px 8px 1px 2px',
            }}
          >
            <StaffAvatar staffMember={staffMember} size={24} />
            <Text style={{ fontSize: 12 }}>
              {staffMember.firstName} {staffMember.lastName}
            </Text>
          </Flex>
        ))}
        {staff.hidden.length > 0 && <Text style={{ fontSize: 11 }}>+{staff.hidden.length}</Text>}
      </Flex>
    ) : (
      <Flex align="center" gap={6}>
        <Flex>
          {staff.visible.map((staffMember, index) => (
            <div key={staffMember.id} style={{ marginInlineStart: index === 0 ? 0 : -8 }}>
              <StaffAvatar staffMember={staffMember} size={24} />
            </div>
          ))}
        </Flex>
        {staff.hidden.length > 0 && <Text style={{ fontSize: 11 }}>+{staff.hidden.length}</Text>}
      </Flex>
    );

  return (
    <>
      <Flex align="center" gap={4} wrap style={{ flex: 'none' }}>
        <Text ellipsis style={{ fontSize: 13, fontWeight: 500 }}>
          {title}
        </Text>
        {isInactive && (
          <Tag style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>
            {t(`projects.form.statuses.${event.project.status}`)}
          </Tag>
        )}
      </Flex>

      {density.showSchedule && (
        <Text type="secondary" style={{ fontSize: 11, flex: 'none' }}>
          {scheduleLabel}
        </Text>
      )}

      {density.staffMode !== 'none' && event.staff.length > 0 && (
        <div style={{ flex: 'none' }}>
          {staff.hidden.length > 0 ? <Tooltip title={staffNames}>{staffContent}</Tooltip> : staffContent}
        </div>
      )}

      {density.maxProducts > 0 && event.products.length > 0 && (
        <Flex gap={4} wrap style={{ flex: 'none' }}>
          {visibleProducts.map((product) => (
            <Tag key={product.productId} color="blue" style={{ fontSize: 11, marginInlineEnd: 0 }}>
              {product.name} ×{product.quantity}
            </Tag>
          ))}
          {hiddenProducts.length > 0 && (
            <Tooltip title={hiddenProducts.map((product) => `${product.name} ×${product.quantity}`).join(', ')}>
              <Tag style={{ fontSize: 11, marginInlineEnd: 0 }}>+{hiddenProducts.length}</Tag>
            </Tooltip>
          )}
        </Flex>
      )}
    </>
  );
}
