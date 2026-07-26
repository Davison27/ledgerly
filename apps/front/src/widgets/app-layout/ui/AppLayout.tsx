import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Layout } from 'antd';
import { companyNeedsSetup, useCompany } from '@/entities/company';
import { useSyncBrandColor } from '../model/useSyncBrandColor';
import { AppSider } from './AppSider';
import { TopBar } from './TopBar';

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
      <Layout hasSider style={{ height: '100vh', overflow: 'hidden' }}>
        <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout style={{ minHeight: 0 }}>
          <TopBar search={search} />
          <Layout.Content
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'auto',
            }}
          >
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    </CompanyGuard>
  );
}
