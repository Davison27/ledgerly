import { Outlet } from '@tanstack/react-router';
import { Layout } from 'antd';
import { CompanyProvider } from '../../app/providers/CompanyProvider';
import { OpenProjectsProvider } from '../../app/providers/OpenProjectsProvider';
import { TopBar } from './TopBar';
import { ProjectTabsBar } from './ProjectTabsBar';

export function AppLayout() {
  return (
    <CompanyProvider>
      <OpenProjectsProvider>
        <Layout style={{ minHeight: '100vh' }}>
          <TopBar />
          <ProjectTabsBar />
          <Layout.Content
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Outlet />
          </Layout.Content>
        </Layout>
      </OpenProjectsProvider>
    </CompanyProvider>
  );
}
