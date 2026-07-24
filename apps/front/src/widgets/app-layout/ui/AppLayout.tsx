import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Layout } from 'antd';
import { CompanyProvider, companyNeedsSetup, useCompany } from '@/entities/company';
import { AppSider } from './AppSider';
import { TopBar } from './TopBar';

function CompanyGuard({ children }: { children: ReactNode }) {
  const { company, companyLoading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!companyLoading && companyNeedsSetup(company)) {
      void navigate({ to: '/onboarding' });
    }
  }, [company, companyLoading, navigate]);

  return <>{children}</>;
}

export interface AppLayoutProps {
  search?: ReactNode;
}

export function AppLayout({ search }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CompanyProvider>
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
    </CompanyProvider>
  );
}
