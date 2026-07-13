import { useState } from 'react';
import { Card, Flex, Switch, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getProjectIntegrations } from '../../../../data/projectSettings';

const { Text } = Typography;

/** Tarjeta de integraciones: estado y conmutador de conexión (estado local). */
export function IntegrationsCard() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState(() => getProjectIntegrations());

  const toggle = (key: string, connected: boolean) =>
    setIntegrations((prev) =>
      prev.map((item) => (item.key === key ? { ...item, connected } : item)),
    );

  return (
    <Card title={t('projects.settings.integrations')} variant="outlined">
      <Flex vertical gap={16}>
        {integrations.map((integration) => (
          <Flex
            key={integration.key}
            align="center"
            justify="space-between"
            gap={12}
          >
            <Text>{integration.name}</Text>
            <Flex align="center" gap={12}>
              <Tag color={integration.connected ? 'green' : undefined}>
                {t(
                  integration.connected
                    ? 'projects.settings.connected'
                    : 'projects.settings.disconnected',
                )}
              </Tag>
              <Switch
                checked={integration.connected}
                onChange={(checked) => toggle(integration.key, checked)}
              />
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
