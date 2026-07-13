import { useState } from 'react';
import { Card, Flex, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const NOTIFICATION_KEYS = ['news', 'overdue', 'weekly', 'team'] as const;
type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

const DEFAULTS: Record<NotificationKey, boolean> = {
  news: true,
  overdue: true,
  weekly: false,
  team: true,
};

export function NotificationsCard() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<Record<NotificationKey, boolean>>(DEFAULTS);

  return (
    <Card title={t('projects.settings.notifications')} variant="outlined">
      <Flex vertical gap={16}>
        {NOTIFICATION_KEYS.map((key) => (
          <Flex key={key} align="center" justify="space-between" gap={16}>
            <Text>{t(`projects.settings.notif.${key}`)}</Text>
            <Switch
              checked={enabled[key]}
              onChange={(checked) =>
                setEnabled((prev) => ({ ...prev, [key]: checked }))
              }
            />
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
