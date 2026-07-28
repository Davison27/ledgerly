import { Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  notificationDescriptionKey,
  notificationDescriptionParams,
  notificationTitleKey,
  SEVERITY_TONE,
  type NotificationView,
} from '@/entities/notification';
import { formatRelativeTime } from '@/shared/lib/dates';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import styles from './NotificationItem.module.css';

const { Text } = Typography;

export interface NotificationItemProps {
  view: NotificationView;
  onSelect: (view: NotificationView) => void;
}

export function NotificationItem({ view, onSelect }: NotificationItemProps) {
  const { t, i18n } = useTranslation();

  const descriptionParams = notificationDescriptionParams(view, i18n.language, (kind) =>
    t(`calendar.conflicts.kind.${kind}`),
  );

  return (
    <Flex
      gap={10}
      align="flex-start"
      className={styles.item}
      data-unread={!view.readAt}
      onClick={() => onSelect(view)}
    >
      <span className={styles.unreadDot} aria-hidden />

      <Flex vertical gap={4} className={styles.body}>
        <Flex align="center" justify="space-between" gap={8}>
          <SemanticTag tone={SEVERITY_TONE[view.severity]}>
            {t(`notifications.severity.${view.severity}`)}
          </SemanticTag>
          <Text type="secondary" className={styles.time}>
            {formatRelativeTime(view.createdAt, i18n.language)}
          </Text>
        </Flex>

        <Text strong className={styles.itemTitle}>
          {t(notificationTitleKey(view.type))}
        </Text>

        <Text type="secondary" className={styles.itemDescription}>
          {t(notificationDescriptionKey(view.type), descriptionParams)}
        </Text>

        {view.context.amount !== null && (
          <Text strong className={styles.amount}>
            {new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(
              view.context.amount,
            )}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
