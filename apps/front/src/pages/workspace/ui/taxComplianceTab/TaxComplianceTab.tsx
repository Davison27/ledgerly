import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Flex,
  Skeleton,
  Switch,
  Table,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { projectQueries, type Project } from '@/entities/project';
import {
  refreshTaxSources,
  reviewTaxSource,
  taxComplianceQueries,
  updateTaxComplianceSettings,
  type TaxClientProfileDto,
  type TaxSourceStateDto,
} from '@/entities/tax-compliance';
import { ApiError } from '@/shared/api/httpClient';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { SemanticTag, type SemanticTone } from '@/shared/ui/SemanticTag';
import workspace from '../workspace.module.css';
import styles from './TaxComplianceTab.module.css';
import { TaxProfileModal } from './TaxProfileModal';

const { Title, Text } = Typography;

function sourceStatusTone(status: TaxSourceStateDto['status']): SemanticTone {
  if (status === 'current') return 'income';
  if (status === 'changed') return 'pending';
  if (status === 'error') return 'overdue';
  return 'neutral';
}

export function TaxComplianceTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [refreshingSources, setRefreshingSources] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const {
    data: settings,
    isPending: settingsLoading,
    isError: settingsError,
  } = useQuery(taxComplianceQueries.settings());
  const { data: projects = [], isPending: projectsLoading } = useQuery(projectQueries.list());
  const { data: obligations = [], isPending: obligationsLoading } = useQuery({
    ...taxComplianceQueries.catalog(),
    enabled: settings?.enabled === true,
  });
  const { data: profiles = [], isPending: profilesLoading } = useQuery({
    ...taxComplianceQueries.profiles(),
    enabled: settings?.enabled === true,
  });
  const { data: sources = [], isPending: sourcesLoading } = useQuery({
    ...taxComplianceQueries.sources(),
    enabled: settings?.enabled === true,
  });

  const profilesByProject = useMemo(
    () => new Map(profiles.map((profile) => [profile.projectId, profile])),
    [profiles],
  );
  const selectedProfile = selectedProject
    ? (profilesByProject.get(selectedProject.id) ?? null)
    : null;

  const toggleFeature = async (enabled: boolean) => {
    setBusy(true);
    try {
      await updateTaxComplianceSettings({ enabled });
      await queryClient.invalidateQueries({ queryKey: taxComplianceQueries.all });
      void message.success(
        enabled
          ? t('workspace.taxCompliance.toast.enabled')
          : t('workspace.taxCompliance.toast.disabled'),
      );
    } catch (error) {
      void message.error(
        error instanceof ApiError ? error.message : t('workspace.taxCompliance.toast.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshProfiles = async () => {
    await queryClient.invalidateQueries({ queryKey: taxComplianceQueries.profiles().queryKey });
    await queryClient.invalidateQueries({ queryKey: taxComplianceQueries.all });
  };

  const checkSources = async () => {
    setRefreshingSources(true);
    try {
      await refreshTaxSources();
      await queryClient.invalidateQueries({ queryKey: taxComplianceQueries.sources().queryKey });
      void message.success(t('workspace.taxCompliance.sources.checked'));
    } catch (error) {
      void message.error(
        error instanceof ApiError ? error.message : t('workspace.taxCompliance.sources.checkError'),
      );
    } finally {
      setRefreshingSources(false);
    }
  };

  const acknowledgeSource = async (source: TaxSourceStateDto) => {
    try {
      await reviewTaxSource(source.sourceKey);
      await queryClient.invalidateQueries({ queryKey: taxComplianceQueries.sources().queryKey });
      void message.success(t('workspace.taxCompliance.sources.reviewed'));
    } catch (error) {
      void message.error(
        error instanceof ApiError
          ? error.message
          : t('workspace.taxCompliance.sources.reviewError'),
      );
    }
  };

  if (settingsLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (settingsError)
    return <Alert type="error" showIcon message={t('workspace.taxCompliance.loadError')} />;

  return (
    <div className={workspace.tabBody}>
      <div>
        <Title level={4}>{t('workspace.taxCompliance.title')}</Title>
        <Text type="secondary">{t('workspace.taxCompliance.subtitle')}</Text>
      </div>

      <Card size="small">
        <Flex align="flex-start" justify="space-between" gap={16}>
          <Flex gap={12} align="flex-start">
            <SafetyCertificateOutlined className={styles.cardIcon} />
            <Flex vertical gap={4}>
              <Text strong>{t('workspace.taxCompliance.card.title')}</Text>
              <Text type="secondary">{t('workspace.taxCompliance.card.description')}</Text>
              <Text type="secondary">{t('workspace.taxCompliance.card.hint')}</Text>
            </Flex>
          </Flex>
          <Switch
            checked={settings?.enabled === true}
            loading={busy}
            aria-label={t('workspace.taxCompliance.card.enabledLabel')}
            onChange={(enabled) => void toggleFeature(enabled)}
          />
        </Flex>
      </Card>

      {!settings?.enabled ? (
        <EmptyHint
          icon={<CalendarOutlined />}
          title={t('workspace.taxCompliance.disabled.title')}
          hint={t('workspace.taxCompliance.disabled.hint')}
        />
      ) : projectsLoading || obligationsLoading || profilesLoading || sourcesLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Card
            size="small"
            title={
              <Flex align="center" gap={8}>
                <ReloadOutlined />
                <span>{t('workspace.taxCompliance.sources.title')}</span>
              </Flex>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                loading={refreshingSources}
                onClick={() => void checkSources()}
              >
                {t('workspace.taxCompliance.sources.checkNow')}
              </Button>
            }
            classNames={{ body: styles.sourcesBody }}
          >
            <Table<TaxSourceStateDto>
              rowKey="sourceKey"
              size="small"
              dataSource={sources}
              pagination={false}
              columns={[
                {
                  title: t('workspace.taxCompliance.sources.source'),
                  key: 'source',
                  render: (_, source) => (
                    <Flex vertical>
                      <Text strong>{source.label}</Text>
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {t('workspace.taxCompliance.sources.officialSource')}
                      </a>
                      {source.lastError && <Text type="danger">{source.lastError}</Text>}
                    </Flex>
                  ),
                },
                {
                  title: t('workspace.taxCompliance.sources.status'),
                  key: 'status',
                  render: (_, source) => (
                    <SemanticTag tone={sourceStatusTone(source.status)}>
                      {t(`workspace.taxCompliance.sources.statuses.${source.status}`)}
                    </SemanticTag>
                  ),
                },
                {
                  title: t('workspace.taxCompliance.sources.lastChecked'),
                  key: 'lastChecked',
                  render: (_, source) =>
                    source.lastCheckedAt
                      ? dayjs(source.lastCheckedAt).format('DD/MM/YYYY HH:mm')
                      : '—',
                },
                {
                  title: t('workspace.taxCompliance.sources.sourceUpdated'),
                  key: 'sourceUpdated',
                  render: (_, source) =>
                    source.lastSourceModifiedAt
                      ? dayjs(source.lastSourceModifiedAt).format('DD/MM/YYYY HH:mm')
                      : '—',
                },
                {
                  title: t('workspace.taxCompliance.sources.changes'),
                  key: 'changes',
                  render: (_, source) =>
                    source.changes.length > 0 ? (
                      <Flex vertical gap={2}>
                        <SemanticTag tone="pending">
                          {t('workspace.taxCompliance.sources.changeCount', {
                            count: source.changes.length,
                          })}
                        </SemanticTag>
                        {source.changes.slice(0, 2).map((change) => (
                          <Text type="secondary" ellipsis key={`${change.kind}-${change.uid}`}>
                            {t(`workspace.taxCompliance.sources.changeKinds.${change.kind}`)} ·{' '}
                            {change.after?.summary ?? change.before?.summary ?? change.uid}
                          </Text>
                        ))}
                      </Flex>
                    ) : (
                      <Text type="secondary">{t('workspace.taxCompliance.sources.noChanges')}</Text>
                    ),
                },
                {
                  key: 'actions',
                  align: 'right' as const,
                  render: (_, source) =>
                    source.status === 'changed' ? (
                      <Button onClick={() => void acknowledgeSource(source)}>
                        {t('workspace.taxCompliance.sources.review')}
                      </Button>
                    ) : null,
                },
              ]}
            />
            <Text type="secondary" className={styles.legalNote}>
              {t('workspace.taxCompliance.sources.legalNote')}
            </Text>
          </Card>

          {projects.length === 0 ? (
            <EmptyHint
              icon={<TeamOutlined />}
              title={t('workspace.taxCompliance.clients.empty')}
              hint={t('workspace.taxCompliance.clients.emptyHint')}
            />
          ) : (
            <Card
              size="small"
              title={
                <Flex align="center" gap={8}>
                  <SettingOutlined />
                  <span>{t('workspace.taxCompliance.clients.title')}</span>
                </Flex>
              }
            >
              <Table<Project>
                rowKey="id"
                size="small"
                dataSource={projects}
                pagination={false}
                columns={[
                  {
                    title: t('workspace.taxCompliance.clients.client'),
                    key: 'client',
                    render: (_, project) => (
                      <Flex vertical>
                        <Text strong>{project.name}</Text>
                        <Text type="secondary">{project.code}</Text>
                      </Flex>
                    ),
                  },
                  {
                    title: t('workspace.taxCompliance.clients.status'),
                    key: 'status',
                    render: (_, project) => {
                      const profile: TaxClientProfileDto | undefined = profilesByProject.get(
                        project.id,
                      );
                      return profile?.enabled && profile.obligationKeys.length > 0 ? (
                        <SemanticTag tone="income">
                          {t('workspace.taxCompliance.clients.configured')}
                        </SemanticTag>
                      ) : (
                        <SemanticTag tone="pending">
                          {t('workspace.taxCompliance.clients.pending')}
                        </SemanticTag>
                      );
                    },
                  },
                  {
                    title: t('workspace.taxCompliance.clients.obligations'),
                    key: 'obligations',
                    render: (_, project) =>
                      profilesByProject.get(project.id)?.obligationKeys.length ?? 0,
                  },
                  {
                    key: 'actions',
                    align: 'right' as const,
                    render: (_, project) => (
                      <Button
                        icon={<SettingOutlined />}
                        onClick={() => setSelectedProject(project)}
                      >
                        {t('workspace.taxCompliance.clients.configure')}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>
          )}
        </>
      )}

      <TaxProfileModal
        open={selectedProject !== null}
        project={selectedProject}
        profile={selectedProfile}
        obligations={obligations}
        loading={obligationsLoading || profilesLoading}
        onClose={() => setSelectedProject(null)}
        onSaved={refreshProfiles}
      />
    </div>
  );
}
