import { Tabs } from 'antd';
import { Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useWorkspacePage, type WorkspaceTab } from '../../model/useWorkspacePage';
import { CompanyTab } from '../companyTab/CompanyTab';
import { MembersTab } from '../membersTab/MembersTab';
import { IntegrationsTab } from '../integrationsTab/IntegrationsTab';
import { TaxComplianceTab } from '../taxComplianceTab/TaxComplianceTab';

export function WorkspacePage() {
  const { t } = useTranslation();
  const { tab, setTab } = useWorkspacePage();
  const { isAdmin } = useWorkspaceAccess();

  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <PageContainer>
      <PageHeader title={t('workspace.title')} subtitle={t('workspace.subtitle')} />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as WorkspaceTab)}
        items={[
          {
            key: 'company',
            label: t('workspace.tabs.company'),
            children: <CompanyTab />,
          },
          {
            key: 'members',
            label: t('workspace.tabs.members'),
            children: <MembersTab />,
          },
          {
            key: 'integrations',
            label: t('workspace.tabs.integrations'),
            children: <IntegrationsTab />,
          },
          {
            key: 'tax-compliance',
            label: t('workspace.tabs.taxCompliance'),
            children: <TaxComplianceTab />,
          },
        ]}
      />
    </PageContainer>
  );
}
