import { useState } from 'react';
import { Card, Flex, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { CompanyDashboardDto } from '../api/types';
import { Amount } from '@/shared/ui/Amount';
import { EmptyHint } from '@/shared/ui/EmptyHint';

const { Text } = Typography;
const { useToken } = theme;

export interface TopProjectsCardProps {
  topProjects: CompanyDashboardDto['topProjects'];
}

export function TopProjectsCard({ topProjects }: TopProjectsCardProps) {
  const { t } = useTranslation();
  const { token } = useToken();
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(1, ...topProjects.map((p) => p.total));

  return (
    <Card
      size="small"
      title={t('dashboard.topProjects.title')}
      style={{ flex: '1 1 320px', minWidth: 300 }}
    >
      {topProjects.length === 0 ? (
        <EmptyHint icon={<FolderOpenOutlined />} title={t('dashboard.topProjects.empty')} />
      ) : (
        <Flex vertical gap={8}>
          {topProjects.map((project) => (
            <Flex
              key={project.id}
              align="center"
              gap={12}
              style={{
                borderRadius: token.borderRadiusSM,
                padding: '4px 6px',
                marginInline: -6,
                background: hovered === project.id ? token.colorFillTertiary : 'transparent',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={() => setHovered(project.id)}
              onMouseLeave={() => setHovered(null)}
            >
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
                <Amount value={project.total} />
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
