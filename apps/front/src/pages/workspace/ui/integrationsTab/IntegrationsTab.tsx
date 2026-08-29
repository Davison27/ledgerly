import { Alert, Col, Input, Row, Segmented, Skeleton, Typography } from 'antd';
import { ApiOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { INTEGRATION_FAMILIES } from '@/entities/integration';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { useIntegrationsPanel, type IntegrationFamilyFilter } from '../../model/useIntegrationsPanel';
import { IntegrationCard } from '../integrationCard/IntegrationCard';
import { IntegrationDrawer } from '../integrationDrawer/IntegrationDrawer';
import workspace from '../workspace.module.css';
import styles from './IntegrationsTab.module.css';

const { Title, Text } = Typography;

export function IntegrationsTab() {
  const { t } = useTranslation();
  const panel = useIntegrationsPanel();

  if (panel.loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (panel.loadError) {
    return <Alert type="error" showIcon title={t('workspace.integrations.loadError')} />;
  }

  return (
    <div className={workspace.tabBody}>
      <div>
        <Title level={4}>{t('workspace.integrations.title')}</Title>
        <Text type="secondary">{t('workspace.integrations.subtitle')}</Text>
      </div>

      <div className={workspace.toolbar}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('workspace.integrations.searchPlaceholder')}
          value={panel.search}
          onChange={(event) => panel.setSearch(event.target.value)}
          className={styles.search}
        />
        <div className={styles.familyFilter}>
          <Segmented<IntegrationFamilyFilter>
            value={panel.familyFilter}
            onChange={panel.setFamilyFilter}
            options={[
              { value: 'all', label: t('workspace.integrations.filters.all') },
              ...INTEGRATION_FAMILIES.map((family) => ({
                value: family,
                label: t(`workspace.integrations.families.${family}.name`),
              })),
            ]}
          />
        </div>
      </div>

      {panel.groups.length === 0 ? (
        <EmptyHint
          icon={<ApiOutlined />}
          title={t('workspace.integrations.empty')}
          hint={t('workspace.integrations.emptyHint')}
        />
      ) : (
        <div className={workspace.sectionGrid}>
          {panel.groups.map((group) => (
            <div key={group.family} className={styles.familyGroup}>
              <div>
                <Title level={5} className={styles.familyHeader}>
                  {t(`workspace.integrations.families.${group.family}.name`)}
                </Title>
                <Text type="secondary">{t(`workspace.integrations.families.${group.family}.description`)}</Text>
              </div>
              <Row gutter={[16, 16]}>
                {group.items.map((integration) => (
                  <Col key={integration.key} xs={24} sm={12} xl={8}>
                    <IntegrationCard
                      integration={integration}
                      busy={panel.busyKey === integration.key}
                      onOpen={() => panel.openDrawer(integration.key)}
                      onConnect={() => void panel.connect(integration.key)}
                      onToggleEnabled={(enabled) => void panel.toggleEnabled(integration.key, enabled)}
                    />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      )}

      <IntegrationDrawer
        integration={panel.selected}
        open={panel.open}
        busy={panel.selected != null && panel.busyKey === panel.selected.key}
        saving={panel.saving}
        testResult={panel.testResult}
        onClose={panel.closeDrawer}
        onConnect={(key) => void panel.connect(key)}
        onDisconnect={(key) => void panel.disconnect(key)}
        onTest={(key) => void panel.test(key)}
        onCopy={(value) => void panel.copy(value)}
        onSaveSettings={(key, settings) => void panel.saveSettings(key, settings)}
      />
    </div>
  );
}
