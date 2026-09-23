import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Flex, Layout, Result, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { companyNeedsSetup, companyQueries } from '@/entities/company';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { ReleaseNoticeDialog } from '@/features/release-notice';
import { useSyncBrandColor } from '../../model/useSyncBrandColor';
import { AppSider } from '../sider/AppSider';
import { TopBar } from '../topBar/TopBar';
import styles from './AppLayout.module.css';

function CompanyGuard({
  children,
  onViewChangelog,
}: {
  children: ReactNode;
  onViewChangelog: () => void;
}) {
  const { isAdmin, isPending: accessPending } = useWorkspaceAccess();
  const companyQuery = useQuery({ ...companyQueries.singleton(), enabled: isAdmin });
  const brandingQuery = useQuery({
    ...companyQueries.branding(),
    enabled: !isAdmin && !accessPending,
  });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const needsSetup =
    isAdmin && companyQuery.isSuccess && companyNeedsSetup(companyQuery.data ?? { id: '', name: '' });
  const isWaitingForConfiguration =
    !isAdmin &&
    !accessPending &&
    brandingQuery.isSuccess &&
    brandingQuery.data.name.trim().length === 0 &&
    pathname !== '/changelog';
  const isCheckingConfiguration =
    !isAdmin &&
    !accessPending &&
    brandingQuery.isPending &&
    pathname !== '/changelog';
  const canShowReleaseNotice = isAdmin
    ? companyQuery.isSuccess && !needsSetup
    : !accessPending && brandingQuery.isSuccess;

  useEffect(() => {
    if (needsSetup) {
      void navigate({ to: '/onboarding' });
    }
  }, [navigate, needsSetup]);

  return (
    <>
      {isCheckingConfiguration ? (
        <CheckingConfiguration />
      ) : isWaitingForConfiguration ? (
        <WaitingForConfiguration />
      ) : (
        children
      )}
      {canShowReleaseNotice && <ReleaseNoticeDialog onViewChangelog={onViewChangelog} />}
    </>
  );
}

function WaitingForConfiguration() {
  const { t } = useTranslation();

  return (
    <Result
      status="info"
      title={t('access.waitingForConfiguration.title')}
      subTitle={t('access.waitingForConfiguration.description')}
    />
  );
}

function CheckingConfiguration() {
  const { t } = useTranslation();

  return (
    <Flex flex="auto" align="center" justify="center" gap="small" role="status" aria-live="polite">
      <Spin />
      <span>{t('common.loadingPage')}</span>
    </Flex>
  );
}

export interface AppLayoutProps {
  search?: ReactNode;
}

export function AppLayout({ search }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  useSyncBrandColor();

  return (
    <Layout hasSider className={styles.shell}>
      <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout className={styles.main}>
        <TopBar search={search} />
        <Layout.Content className={styles.content}>
          <CompanyGuard onViewChangelog={() => void navigate({ to: '/changelog' })}>
            <Outlet />
          </CompanyGuard>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
