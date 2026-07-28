import { useMemo, useState, type ReactNode } from 'react';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiOutlined,
  CalendarOutlined,
  CloudOutlined,
  ContactsOutlined,
  FileExcelOutlined,
  FolderOpenOutlined,
  InboxOutlined,
  KeyOutlined,
  LinkOutlined,
  MailOutlined,
  MessageOutlined,
  ScheduleOutlined,
  SendOutlined,
  SlackOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  INTEGRATION_FAMILIES,
  connectIntegration,
  disconnectIntegration,
  integrationQueries,
  setIntegrationEnabled,
  testIntegration,
  updateIntegrationSettings,
  type IntegrationDto,
  type IntegrationFamilyDto,
  type IntegrationKeyDto,
  type IntegrationSettingValueDto,
} from '@/entities/integration';

export const INTEGRATION_ICONS: Record<IntegrationKeyDto, ReactNode> = {
  'google-calendar': <CalendarOutlined />,
  'google-drive': <CloudOutlined />,
  gmail: <MailOutlined />,
  'google-sheets': <TableOutlined />,
  'google-contacts': <ContactsOutlined />,
  'outlook-calendar': <ScheduleOutlined />,
  onedrive: <FolderOpenOutlined />,
  'excel-online': <FileExcelOutlined />,
  slack: <SlackOutlined />,
  telegram: <SendOutlined />,
  discord: <MessageOutlined />,
  'outgoing-webhooks': <ApiOutlined />,
  'calendar-feed': <LinkOutlined />,
  'smtp-imap': <InboxOutlined />,
  'api-keys': <KeyOutlined />,
};

export type IntegrationFamilyFilter = IntegrationFamilyDto | 'all';

export interface IntegrationGroup {
  family: IntegrationFamilyDto;
  items: IntegrationDto[];
}

export interface IntegrationTestResult {
  key: IntegrationKeyDto;
  ok: boolean;
}

export interface UseIntegrationsPanelResult {
  loading: boolean;
  loadError: boolean;
  groups: IntegrationGroup[];
  search: string;
  setSearch: (value: string) => void;
  familyFilter: IntegrationFamilyFilter;
  setFamilyFilter: (value: IntegrationFamilyFilter) => void;
  selected: IntegrationDto | null;
  open: boolean;
  openDrawer: (key: IntegrationKeyDto) => void;
  closeDrawer: () => void;
  busyKey: IntegrationKeyDto | null;
  saving: boolean;
  testResult: IntegrationTestResult | null;
  connect: (key: IntegrationKeyDto) => Promise<void>;
  disconnect: (key: IntegrationKeyDto) => Promise<void>;
  toggleEnabled: (key: IntegrationKeyDto, enabled: boolean) => Promise<void>;
  saveSettings: (key: IntegrationKeyDto, settings: Record<string, IntegrationSettingValueDto>) => Promise<void>;
  test: (key: IntegrationKeyDto) => Promise<void>;
  copy: (value: string) => Promise<void>;
}

export function useIntegrationsPanel(): UseIntegrationsPanelResult {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    data: integrations = [],
    isPending: loading,
    isError: loadError,
  } = useQuery(integrationQueries.list());

  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<IntegrationFamilyFilter>('all');
  const [selectedKey, setSelectedKey] = useState<IntegrationKeyDto | null>(null);
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<IntegrationKeyDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);

  const selected = useMemo(
    () => (selectedKey ? (integrations.find((integration) => integration.key === selectedKey) ?? null) : null),
    [integrations, selectedKey],
  );

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return INTEGRATION_FAMILIES.filter((family) => familyFilter === 'all' || familyFilter === family)
      .map((family) => ({
        family,
        items: integrations.filter((integration) => {
          if (integration.family !== family) return false;
          if (!query) return true;
          const name = t(`workspace.integrations.catalog.${integration.key}.name`).toLowerCase();
          return name.includes(query) || integration.key.toLowerCase().includes(query);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [integrations, search, familyFilter, t]);

  const openDrawer = (key: IntegrationKeyDto) => {
    setSelectedKey(key);
    setOpen(true);
    setTestResult(null);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  const nameOf = (key: IntegrationKeyDto) => t(`workspace.integrations.catalog.${key}.name`);

  const connect = async (key: IntegrationKeyDto) => {
    setBusyKey(key);
    try {
      await connectIntegration(key);
      await queryClient.invalidateQueries({ queryKey: integrationQueries.all });
      void message.success(t('workspace.integrations.toast.connected', { name: nameOf(key) }));
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    } finally {
      setBusyKey(null);
    }
  };

  const disconnect = async (key: IntegrationKeyDto) => {
    setBusyKey(key);
    try {
      await disconnectIntegration(key);
      await queryClient.invalidateQueries({ queryKey: integrationQueries.all });
      void message.success(t('workspace.integrations.toast.disconnected', { name: nameOf(key) }));
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    } finally {
      setBusyKey(null);
    }
  };

  const toggleEnabled = async (key: IntegrationKeyDto, enabled: boolean) => {
    setBusyKey(key);
    try {
      await setIntegrationEnabled(key, enabled);
      await queryClient.invalidateQueries({ queryKey: integrationQueries.all });
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    } finally {
      setBusyKey(null);
    }
  };

  const saveSettings = async (key: IntegrationKeyDto, settings: Record<string, IntegrationSettingValueDto>) => {
    setSaving(true);
    try {
      await updateIntegrationSettings(key, settings);
      await queryClient.invalidateQueries({ queryKey: integrationQueries.all });
      void message.success(t('workspace.integrations.toast.saved'));
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    } finally {
      setSaving(false);
    }
  };

  const test = async (key: IntegrationKeyDto) => {
    setBusyKey(key);
    try {
      const result = await testIntegration(key);
      setTestResult({ key, ok: result.ok });
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    } finally {
      setBusyKey(null);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      void message.success(t('workspace.integrations.toast.copied'));
    } catch {
      void message.error(t('workspace.integrations.toast.error'));
    }
  };

  return {
    loading,
    loadError,
    groups,
    search,
    setSearch,
    familyFilter,
    setFamilyFilter,
    selected,
    open,
    openDrawer,
    closeDrawer,
    busyKey,
    saving,
    testResult,
    connect,
    disconnect,
    toggleEnabled,
    saveSettings,
    test,
    copy,
  };
}
