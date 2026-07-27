import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Layout } from 'antd';
import { companyNeedsSetup, useCompany } from '@/entities/company';
import { useSyncBrandColor } from '../model/useSyncBrandColor';
import { AppSider } from './AppSider';
import { TopBar } from './TopBar';
import styles from './AppLayout.module.css';

function CompanyGuard({ children }: { children: ReactNode }) {
  const { company, isLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && companyNeedsSetup(company)) {
      void navigate({ to: '/onboarding' });
    }
  }, [company, isLoading, navigate]);

  return <>{children}</>;
}

export interface AppLayoutProps {
  search?: ReactNode;
}

export function AppLayout({ search }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  useSyncBrandColor();

  return (
    <CompanyGuard>
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
