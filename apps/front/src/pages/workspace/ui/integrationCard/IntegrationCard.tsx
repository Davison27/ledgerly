import { Avatar, Button, Card, Flex, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { IntegrationStatusTag, type IntegrationDto } from '@/entities/integration';
import { formatRelativeTime } from '@/shared/lib/dates';
import typography from '@/shared/ui/typography.module.css';
import { INTEGRATION_ICONS } from '../../model/useIntegrationsPanel';
import styles from './IntegrationCard.module.css';

const { Text } = Typography;

export interface IntegrationCardProps {
  integration: IntegrationDto;
  busy: boolean;
  onOpen: () => void;
  onConnect: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export function IntegrationCard({ integration, busy, onOpen, onConnect, onToggleEnabled }: IntegrationCardProps) {
  const { t, i18n } = useTranslation();

  const name = t(`workspace.integrations.catalog.${integration.key}.name`);
  const description = t(`workspace.integrations.catalog.${integration.key}.description`);

  const metaLine = integration.lastSyncAt
    ? t('workspace.integrations.lastSync', {
        when: formatRelativeTime(new Date(integration.lastSyncAt), i18n.language),
      })
    : integration.connectedAccount
      ? t('workspace.integrations.connectedAs', { account: integration.connectedAccount })
      : integration.status !== 'disconnected'
        ? t('workspace.integrations.neverSynced')
        : null;

  const primaryAction =
    integration.status === 'connected'
      ? { label: t('workspace.integrations.actions.configure'), onClick: onOpen }
      : integration.status === 'error'
        ? { label: t('workspace.integrations.actions.reconnect'), onClick: onConnect }
        : { label: t('workspace.integrations.actions.connect'), onClick: onConnect };

  return (
    <Card hoverable size="small" className={styles.card} onClick={onOpen}>
      <Flex gap={12} align="flex-start">
        <Avatar shape="square" size={40} icon={INTEGRATION_ICONS[integration.key]} className={styles.icon} />
        <Flex vertical gap={4} flex={1} className={styles.body}>
          <Flex align="center" justify="space-between" gap={8}>
            <Text strong ellipsis className={styles.name}>
              {name}
            </Text>
            <IntegrationStatusTag status={integration.status} />
          </Flex>
          <Text type="secondary" className={typography.caption}>
            {description}
          </Text>
          {metaLine && (
            <Text type="secondary" className={typography.caption}>
              {metaLine}
            </Text>
          )}
          {integration.status === 'error' && integration.errorCode && (
            <Text className={`${typography.caption} ${styles.errorLine}`}>
              {t(`workspace.integrations.errors.${integration.errorCode}`)}
            </Text>
          )}
        </Flex>
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        className={styles.footer}
        onClick={(event) => event.stopPropagation()}
      >
        <Switch
          size="small"
          checked={integration.enabled}
          disabled={integration.status === 'disconnected' || busy}
          aria-label={t('workspace.integrations.enabledLabel')}
          onChange={onToggleEnabled}
        />
        <Button size="small" type="primary" loading={busy} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
      </Flex>
    </Card>
  );
}
