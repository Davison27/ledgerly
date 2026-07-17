import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { CompanyProvider, useCompany } from '../../app/providers/CompanyProvider';
import { companyNeedsSetup } from '../../data/company';
import { TopBar } from './TopBar';
import logoIconUrl from '../../assets/ledgerly-icon.svg';

const { useToken } = theme;

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

type NavKey = 'dashboard' | 'projects' | 'suppliers';

function getSelectedKey(pathname: string): NavKey | undefined {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/suppliers')) return 'suppliers';
  return undefined;
}

function AppSider({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}) {
  const { token } = useToken();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedKey = getSelectedKey(pathname);

  const items = useMemo(
    () => [
      {
        key: 'dashboard' satisfies NavKey,
        icon: <DashboardOutlined />,
        label: t('nav.dashboard'),
        onClick: () => void navigate({ to: '/dashboard' }),
      },
      {
        key: 'projects' satisfies NavKey,
        icon: <ProjectOutlined />,
        label: t('nav.projects'),
        onClick: () => void navigate({ to: '/projects' }),
      },
      {
        key: 'suppliers' satisfies NavKey,
        icon: <TeamOutlined />,
        label: t('nav.suppliers'),
        onClick: () => void navigate({ to: '/suppliers' }),
      },
    ],
    [t, navigate],
  );

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      collapsedWidth={64}
      width={220}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={logoIconUrl}
          alt=""
          aria-hidden="true"
          style={{ height: 28, display: 'block', objectFit: 'contain' }}
        />
      </div>
      <Menu
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={selectedKey ? [selectedKey] : []}
        items={items}
        style={{ borderInlineEnd: 'none' }}
      />
    </Layout.Sider>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CompanyProvider>
      <CompanyGuard>
        <Layout hasSider style={{ minHeight: '100vh' }}>
          <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
          <Layout>
            <TopBar />
            <Layout.Content
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <Outlet />
            </Layout.Content>
          </Layout>
        </Layout>
      </CompanyGuard>
    </CompanyProvider>
  );
}
