import { useNavigate, useParams } from '@tanstack/react-router';
import { ConfigProvider, Tabs, theme } from 'antd';
import { getEnterprise } from '../../data/enterprises';
import { useOpenProjects } from '../../app/providers/OpenProjectsProvider';
import styles from './ProjectTabsBar.module.css';

const { useToken } = theme;

export function ProjectTabsBar() {
  const { token } = useToken();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { enterpriseId?: string };
  const enterprise = params.enterpriseId
    ? getEnterprise(params.enterpriseId)
    : undefined;
  const { getOpen, getActive, setActive, closeProject } = useOpenProjects();

  if (!enterprise) return null;
  const openIds = getOpen(enterprise.id);
  if (openIds.length === 0) return null;

  const items = openIds.map((id) => ({
    key: id,
    label: enterprise.projects.find((p) => p.id === id)?.name ?? id,
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
          activeKey={getActive(enterprise.id)}
          items={items}
          onChange={(key) => setActive(enterprise.id, key)}
          onEdit={(targetKey, action) => {
            if (action === 'remove') {
              closeProject(enterprise.id, targetKey as string);
            } else {
              void navigate({
                to: '/projects/$enterpriseId',
                params: { enterpriseId: enterprise.id },
              });
            }
          }}
        />
      </ConfigProvider>
    </div>
  );
}
