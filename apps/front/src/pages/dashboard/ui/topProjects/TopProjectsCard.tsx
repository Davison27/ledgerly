import { useState } from 'react';
import { Card, Flex, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { CompanyDashboardDto } from '../../api/types';
import { Amount } from '@/shared/ui/Amount';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import typography from '@/shared/ui/typography.module.css';
import dashboard from '../dashboard.module.css';
import styles from './TopProjectsCard.module.css';

const { Text } = Typography;

export interface TopProjectsCardProps {
  topProjects: CompanyDashboardDto['topProjects'];
}

export function TopProjectsCard({ topProjects }: TopProjectsCardProps) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(1, ...topProjects.map((p) => p.total));

  return (
    <Card size="small" title={t('dashboard.topProjects.title')} className={dashboard.card}>
      {topProjects.length === 0 ? (
        <EmptyHint icon={<FolderOpenOutlined />} title={t('dashboard.topProjects.empty')} />
      ) : (
        <Flex vertical gap={8}>
          {topProjects.map((project) => (
            <Flex
              key={project.id}
              align="center"
              gap={12}
              className={styles.row}
              data-hovered={hovered === project.id}
              onMouseEnter={() => setHovered(project.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <Text ellipsis className={styles.name} title={project.name}>
                {project.name}
              </Text>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${(project.total / max) * 100}%` }} />
              </div>
              <Text type="secondary" className={`${typography.caption} ${styles.docCount}`}>
                {t(
                  project.documentCount === 1
                    ? 'dashboard.topProjects.docCountOne'
                    : 'dashboard.topProjects.docCountOther',
                  { count: project.documentCount },
                )}
              </Text>
              <Text strong className={styles.amount}>
                <Amount value={project.total} />
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
