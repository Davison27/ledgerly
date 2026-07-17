import { useEffect, type ReactNode } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Layout } from 'antd';
import { CompanyProvider, useCompany } from '../../app/providers/CompanyProvider';
import { companyNeedsSetup } from '../../data/company';
import { TopBar } from './TopBar';

/**
 * Redirects to the onboarding wizard when there's no company data yet.
 * Must be rendered inside CompanyProvider, since it reads company state from it.
 */
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

export function AppLayout() {
  return (
    <CompanyProvider>
      <CompanyGuard>
        <Layout style={{ minHeight: '100vh' }}>
          <TopBar />
          <Layout.Content
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Outlet />
          </Layout.Content>
        </Layout>
      </CompanyGuard>
    </CompanyProvider>
  );
}
