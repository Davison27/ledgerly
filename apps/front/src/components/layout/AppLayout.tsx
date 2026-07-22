import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Button, Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { CompanyProvider, useCompany } from '../../app/providers/CompanyProvider';
import { LAYOUT, SPACE } from '../../app/theme/tokens';
import { companyNeedsSetup } from '../../data/company';
import { CommandPalette } from '../../features/command-palette/CommandPalette';
import { useCommandPalette } from '../../features/command-palette/useCommandPalette';
import { TopBar } from './TopBar';

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

type NavKey = 'dashboard' | 'projects' | 'documents' | 'suppliers' | 'invoices' | 'products';

function getSelectedKey(pathname: string): NavKey | undefined {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/suppliers')) return 'suppliers';
  if (pathname.startsWith('/invoices')) return 'invoices';
  if (pathname.startsWith('/products')) return 'products';
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
        key: 'documents' satisfies NavKey,
        icon: <FileTextOutlined />,
        label: t('nav.documents'),
        onClick: () => void navigate({ to: '/documents' }),
      },
      {
        key: 'suppliers' satisfies NavKey,
        icon: <TeamOutlined />,
        label: t('nav.suppliers'),
        onClick: () => void navigate({ to: '/suppliers' }),
      },
      {
        key: 'invoices' satisfies NavKey,
        icon: <FileDoneOutlined />,
        label: t('nav.invoices'),
        onClick: () => void navigate({ to: '/invoices' }),
      },
      {
        key: 'products' satisfies NavKey,
        icon: <ShoppingOutlined />,
        label: t('nav.products'),
        onClick: () => void navigate({ to: '/products' }),
      },
    ],
    [t, navigate],
  );

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      collapsedWidth={LAYOUT.siderCollapsedWidth}
      width={LAYOUT.siderWidth}
      style={{
        height: `calc(100vh - ${LAYOUT.topbarHeight}px)`,
        position: 'sticky',
        top: LAYOUT.topbarHeight,
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
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
  const { token } = useToken();
  const { t } = useTranslation();
  const { open: paletteOpen, close: closePalette, toggle: togglePalette } = useCommandPalette();

  return (
    <CompanyProvider>
      <CompanyGuard>
        <Layout style={{ minHeight: '100vh' }}>
          <TopBar />
          <Layout hasSider>
            <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
            <Layout.Content
              style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <Outlet />
            </Layout.Content>
          </Layout>
        </Layout>

        <Button
          type="default"
          shape="round"
          icon={<SearchOutlined />}
          onClick={togglePalette}
          style={{
            position: 'fixed',
            bottom: SPACE.xl,
            right: SPACE.xl,
            zIndex: 100,
            boxShadow: token.boxShadowSecondary,
            background: token.colorBgContainer,
          }}
        >
          {t('commandPalette.trigger')} <span style={{ opacity: 0.6 }}>⌘K</span>
        </Button>

        <CommandPalette open={paletteOpen} onClose={closePalette} />
      </CompanyGuard>
    </CompanyProvider>
  );
}
