import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Flex, Segmented, Skeleton, Typography, theme } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { projectQueries } from '@/entities/project';
import { PageContainer } from '@/shared/ui/PageContainer';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import typography from '@/shared/ui/typography.module.css';
import { DocumentsSection } from '../documents/DocumentsSection';
import { DashboardSection } from '../dashboard/DashboardSection';
import { ScheduleSection } from '../schedule/ScheduleSection';
import { SettingsSection } from '../settings/SettingsSection';
import { ProjectProductsSection } from '../products/ProjectProductsSection';
import styles from './ProjectDetailPage.module.css';

const { Text } = Typography;
const { useToken } = theme;

type Section = 'documents' | 'products' | 'dashboard' | 'schedule' | 'settings';

export function ProjectDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { data: projects, isPending } = useQuery(projectQueries.list());
  const project = projects?.find((p) => p.id === projectId);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [section, setSection] = useState<Section>('documents');

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        <Text type="secondary">{t('projects.notFound')}</Text>
      </PageContainer>
    );
  }

  const options = [
    { label: t('projects.sections.documents'), value: 'documents' as const },
    { label: t('projects.sections.products'), value: 'products' as const },
    { label: t('projects.sections.dashboard'), value: 'dashboard' as const },
    { label: t('projects.sections.schedule'), value: 'schedule' as const },
    { label: t('projects.sections.settings'), value: 'settings' as const },
  ];

  return (
    <Flex vertical className={styles.page}>
      <div className={styles.header}>
        <Flex align="center" gap={10}>
          {project.image ? (
            <Avatar shape="square" size={28} src={project.image} />
          ) : (
            <Avatar
              shape="square"
              size={28}
              style={{ backgroundColor: resolveProjectColor(project.color ?? null, project.id, isDark) }}
              icon={<ProjectOutlined />}
            />
          )}
          <Flex align="baseline" gap={8}>
            <Text strong className={styles.projectName}>
              {project.name}
            </Text>
            <Text type="secondary" className={typography.caption}>
              {project.code}
            </Text>
          </Flex>
        </Flex>
        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={options}
        />
      </div>

      <div className={styles.content}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={token.colorPrimary} />
        )}
        {section === 'products' && <ProjectProductsSection project={project} color={token.colorPrimary} />}
        {section === 'dashboard' && (
          <DashboardSection project={project} color={token.colorPrimary} />
        )}
        {section === 'schedule' && (
          <ScheduleSection project={project} color={token.colorPrimary} />
        )}
        {section === 'settings' && (
          <SettingsSection project={project} color={token.colorPrimary} />
        )}
      </div>
    </Flex>
  );
}
