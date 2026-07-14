import { useNavigate } from '@tanstack/react-router';
import { ConfigProvider, Tabs, theme } from 'antd';
import { useCompany } from '../../app/providers/CompanyProvider';
import { useOpenProjects } from '../../app/providers/OpenProjectsProvider';
import styles from './ProjectTabsBar.module.css';

const { useToken } = theme;

export function ProjectTabsBar() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { projects } = useCompany();
  const { getOpen, getActive, setActive, closeProject } = useOpenProjects();

  const openIds = getOpen();
  if (openIds.length === 0) return null;

  const items = openIds.map((id) => ({
    key: id,
    label: projects.find((p) => p.id === id)?.name ?? id,
  }));

  return (
    <div
      className={styles.bar}
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <ConfigProvider
        theme={{ components: { Tabs: { horizontalMargin: '0', cardHeight: 38 } } }}
      >
        <Tabs
          type="editable-card"
          activeKey={getActive()}
          items={items}
          onChange={(key) => {
            setActive(key);
            void navigate({
              to: '/projects/$projectId',
              params: { projectId: key },
            });
          }}
          onEdit={(targetKey, action) => {
            if (action === 'remove') {
              closeProject(targetKey as string);
            } else {
              void navigate({ to: '/projects' });
            }
          }}
        />
      </ConfigProvider>
    </div>
  );
}
