import { useMemo } from 'react';
import { Alert, Button, Drawer, Flex, Form, Input, Popconfirm, Select, Switch, Typography } from 'antd';
import { CopyOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  catalogEntry,
  type IntegrationDto,
  type IntegrationKeyDto,
  type IntegrationSettingValueDto,
} from '@/entities/integration';
import { formatDate } from '@/shared/lib/dates';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import typography from '@/shared/ui/typography.module.css';
import type { IntegrationTestResult } from '../../model/useIntegrationsPanel';
import styles from './IntegrationDrawer.module.css';

const { Title, Text } = Typography;

export interface IntegrationDrawerProps {
  integration: IntegrationDto | null;
  open: boolean;
  busy: boolean;
  saving: boolean;
  testResult: IntegrationTestResult | null;
  onClose: () => void;
  onConnect: (key: IntegrationKeyDto) => void;
  onDisconnect: (key: IntegrationKeyDto) => void;
  onTest: (key: IntegrationKeyDto) => void;
  onCopy: (value: string) => void;
  onSaveSettings: (key: IntegrationKeyDto, settings: Record<string, IntegrationSettingValueDto>) => void;
}

export function IntegrationDrawer({
  integration,
  open,
  busy,
  saving,
  testResult,
  onClose,
  onConnect,
  onDisconnect,
  onTest,
  onCopy,
  onSaveSettings,
}: IntegrationDrawerProps) {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm<Record<string, IntegrationSettingValueDto>>();

  const fields = useMemo(() => (integration ? catalogEntry(integration.key).fields : []), [integration]);
  const connected = integration != null && integration.status !== 'disconnected';

  const initialValues = useMemo(() => {
    const values: Record<string, IntegrationSettingValueDto> = {};
    if (!integration) return values;
    for (const field of fields) {
      if (field.kind === 'copy') continue;
      const current = integration.settings[field.key];
      values[field.key] = field.kind === 'toggle' ? Boolean(current) : (current ?? '');
    }
    return values;
  }, [integration, fields]);

  if (!integration) {
    return <Drawer open={open} onClose={onClose} destroyOnHidden width="min(520px, 100vw)" />;
  }

  const name = t(`workspace.integrations.catalog.${integration.key}.name`);

  const handleSave = async () => {
    let values: Record<string, IntegrationSettingValueDto>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    onSaveSettings(integration.key, { ...integration.settings, ...values });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      destroyOnHidden
      width="min(520px, 100vw)"
      title={name}
      footer={
        <div className={styles.footer}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} disabled={!connected} onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className={styles.section}>
        <Title level={5}>{t('workspace.integrations.drawer.connection')}</Title>

        {!connected ? (
          <EmptyHint
            icon={<DisconnectOutlined />}
            title={t('workspace.integrations.drawer.notConnected')}
            action={
              <Button type="primary" loading={busy} onClick={() => onConnect(integration.key)}>
                {t('workspace.integrations.actions.connect')}
              </Button>
            }
          />
        ) : (
          <Flex vertical gap={12}>
            {integration.status === 'error' && integration.errorCode && (
              <Alert
                type="error"
                showIcon
                message={t(`workspace.integrations.errors.${integration.errorCode}`)}
                action={
                  <Button size="small" danger loading={busy} onClick={() => onConnect(integration.key)}>
                    {t('workspace.integrations.actions.reconnect')}
                  </Button>
                }
              />
            )}

            {integration.connectedAccount && (
              <Text>{t('workspace.integrations.connectedAs', { account: integration.connectedAccount })}</Text>
            )}

            {integration.connectedAt && (
              <Text type="secondary" className={`${typography.caption} ${styles.connectedSince}`}>
                {t('workspace.integrations.drawer.connectedSince', {
                  date: formatDate(integration.connectedAt.slice(0, 10), i18n.language),
                })}
              </Text>
            )}

            <Flex gap={8} wrap>
              <Popconfirm
                title={t('workspace.integrations.confirm.disconnect.title', { name })}
                description={t('workspace.integrations.confirm.disconnect.description')}
                okText={t('workspace.integrations.confirm.disconnect.ok')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDisconnect(integration.key)}
              >
                <Button danger loading={busy}>
                  {t('workspace.integrations.actions.disconnect')}
                </Button>
              </Popconfirm>
              <Button loading={busy} onClick={() => onTest(integration.key)}>
                {t('workspace.integrations.actions.test')}
              </Button>
            </Flex>

            {testResult && testResult.key === integration.key && (
              <Alert
                type={testResult.ok ? 'success' : 'error'}
                showIcon
                message={t(
                  testResult.ok ? 'workspace.integrations.toast.tested' : 'workspace.integrations.toast.testFailed',
                )}
              />
            )}
          </Flex>
        )}
      </div>

      {connected && (
        <div>
          <Title level={5}>{t('workspace.integrations.drawer.settings')}</Title>
          <Form<Record<string, IntegrationSettingValueDto>> form={form} layout="vertical" initialValues={initialValues}>
            {fields.map((field) => {
              const label = t(`workspace.integrations.fields.${field.key}`);

              if (field.kind === 'copy') {
                const value = String(integration.settings[field.key] ?? '');
                return (
                  <Form.Item key={field.key} label={label}>
                    <Flex gap={8}>
                      <Input readOnly value={value} className={styles.copyField} />
                      <Button
                        icon={<CopyOutlined />}
                        aria-label={t('workspace.integrations.actions.copy')}
                        onClick={() => onCopy(value)}
                      />
                    </Flex>
                  </Form.Item>
                );
              }

              if (field.kind === 'toggle') {
                return (
                  <Form.Item key={field.key} name={field.key} label={label} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                );
              }

              if (field.kind === 'select') {
                return (
                  <Form.Item
                    key={field.key}
                    name={field.key}
                    label={label}
                    rules={field.required ? [{ required: true }] : undefined}
                  >
                    <Select
                      options={field.options.map((option) => ({
                        value: option,
                        label: t(`workspace.integrations.options.${option}`),
                      }))}
                    />
                  </Form.Item>
                );
              }

              if (field.kind === 'secret') {
                return (
                  <Form.Item
                    key={field.key}
                    name={field.key}
                    label={label}
                    rules={field.required ? [{ required: true }] : undefined}
                  >
                    <Input.Password />
                  </Form.Item>
                );
              }

              return (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={label}
                  rules={field.required ? [{ required: true }] : undefined}
                >
                  <Input />
                </Form.Item>
              );
            })}
          </Form>
        </div>
      )}
    </Drawer>
  );
}
