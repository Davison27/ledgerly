import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Layout } from 'antd';
import { companyNeedsSetup, useCompany } from '@/entities/company';
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
  const { company, isLoading } = useCompany();
  const navigate = useNavigate();
  const needsSetup = !isLoading && companyNeedsSetup(company);

  useEffect(() => {
    if (needsSetup) {
      void navigate({ to: '/onboarding' });
    }
  }, [navigate, needsSetup]);

  return (
    <>
      {children}
      {!isLoading && !needsSetup && <ReleaseNoticeDialog onViewChangelog={onViewChangelog} />}
    </>
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
    <CompanyGuard onViewChangelog={() => void navigate({ to: '/changelog' })}>
      <Layout hasSider className={styles.shell}>
        <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout className={styles.main}>
          <TopBar search={search} />
          <Layout.Content className={styles.content}>
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    </CompanyGuard>
  );
}
