import { Avatar, Card, Flex, Tag, Tooltip, Typography } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ScheduleDaysSummary, type ScheduleEventDto } from '@/entities/schedule-event';
import { StaffAvatar } from '@/entities/staff-member';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { SemanticTag, type SemanticTone } from '@/shared/ui/SemanticTag';
import type { AgendaStatus } from '../model/agenda';

const { Text } = Typography;

const MAX_COWORKERS = 4;
const MAX_PRODUCTS = 3;

const STATUS_TONE: Record<AgendaStatus, SemanticTone> = {
  current: 'info',
  upcoming: 'neutral',
  past: 'neutral',
};

export interface AgendaEventCardProps {
  event: ScheduleEventDto;
  status: AgendaStatus;
  staffMemberId: string;
  onOpenProject: (projectId: string) => void;
}

export function AgendaEventCard({ event, status, staffMemberId, onOpenProject }: AgendaEventCardProps) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const color = resolveProjectColor(event.project.color, event.projectId, isDark);

  const coworkers = event.staff.filter((member) => member.id !== staffMemberId);
  const visibleCoworkers = coworkers.slice(0, MAX_COWORKERS);
  const hiddenCoworkers = coworkers.slice(MAX_COWORKERS);

  const visibleProducts = event.products.slice(0, MAX_PRODUCTS);
  const hiddenProducts = event.products.slice(MAX_PRODUCTS);

  return (
    <Card
      size="small"
      hoverable
      onClick={() => onOpenProject(event.projectId)}
      style={{ borderInlineStart: `4px solid ${color}`, opacity: status === 'past' ? 0.7 : 1 }}
    >
      <Flex vertical gap={8}>
        <Flex align="center" gap={8}>
          {event.project.image ? (
            <Avatar shape="square" size={36} src={event.project.image} />
          ) : (
            <Avatar shape="square" size={36} style={{ backgroundColor: color }} icon={<ProjectOutlined />} />
          )}
          <Flex vertical gap={0} style={{ minWidth: 0 }}>
            <Text strong ellipsis>
              {event.project.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {event.project.code}
            </Text>
          </Flex>
        </Flex>

        {event.title && <Text ellipsis>{event.title}</Text>}
        <ScheduleDaysSummary days={event.days} />

        <Flex gap={6} wrap>
          <SemanticTag tone={STATUS_TONE[status]}>{t(`staff.schedule.status.${status}`)}</SemanticTag>
          <SemanticTag tone="neutral">
            {t(event.days.length === 1 ? 'staff.schedule.dayCountOne' : 'staff.schedule.dayCountOther', {
              count: event.days.length,
            })}
          </SemanticTag>
        </Flex>

        {coworkers.length > 0 && (
          <Flex align="center" gap={8}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t('staff.schedule.coworkers')}
            </Text>
            <Flex>
              {visibleCoworkers.map((member, index) => (
                <div key={member.id} style={{ marginInlineStart: index === 0 ? 0 : -8 }}>
                  <StaffAvatar staffMember={member} size={22} />
                </div>
              ))}
              {hiddenCoworkers.length > 0 && (
                <Tooltip
                  title={hiddenCoworkers.map((member) => `${member.firstName} ${member.lastName}`).join(', ')}
                >
                  <Avatar size={22} style={{ marginInlineStart: -8 }}>
                    +{hiddenCoworkers.length}
                  </Avatar>
                </Tooltip>
              )}
            </Flex>
          </Flex>
        )}

        {event.products.length > 0 && (
          <Flex gap={4} wrap>
            {visibleProducts.map((product) => (
              <Tag key={product.productId} color="blue">
                {product.name} ×{product.quantity}
              </Tag>
            ))}
            {hiddenProducts.length > 0 && (
              <Tooltip
                title={hiddenProducts.map((product) => `${product.name} ×${product.quantity}`).join(', ')}
              >
                <Tag>+{hiddenProducts.length}</Tag>
              </Tooltip>
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
