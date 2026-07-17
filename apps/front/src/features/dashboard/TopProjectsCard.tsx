import { Card, Empty, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import type { CompanyDashboardDto } from '../../data/api/types';
import { formatEur } from '../projects/sections/dashboard/data';

const { Text } = Typography;
const { useToken } = theme;

export interface TopProjectsCardProps {
  topProjects: CompanyDashboardDto['topProjects'];
}

export function TopProjectsCard({ topProjects }: TopProjectsCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();

  const max = Math.max(1, ...topProjects.map((p) => p.total));

  return (
    <Card
      size="small"
      title={t('dashboard.topProjects.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      {topProjects.length === 0 ? (
        <Empty
          description={t('dashboard.topProjects.empty')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Flex vertical gap={8}>
          {topProjects.map((project) => (
            <Flex key={project.id} align="center" gap={12}>
              <Text
                ellipsis
                style={{ flex: '0 1 140px', minWidth: 80 }}
                title={project.name}
              >
                {project.name}
              </Text>
              <div
                style={{
                  flex: '1 1 auto',
                  height: 10,
                  borderRadius: 5,
                  background: token.colorFillSecondary,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(project.total / max) * 100}%`,
                    height: '100%',
                    borderRadius: 5,
                    background: token.colorPrimary,
                  }}
                />
              </div>
              <Text
                type="secondary"
                style={{ flex: 'none', width: 78, textAlign: 'right', fontSize: 12 }}
              >
                {t(
                  project.documentCount === 1
                    ? 'dashboard.topProjects.docCountOne'
                    : 'dashboard.topProjects.docCountOther',
                  { count: project.documentCount },
                )}
              </Text>
              <Text strong style={{ flex: 'none', width: 90, textAlign: 'right' }}>
                {formatEur(project.total)}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
