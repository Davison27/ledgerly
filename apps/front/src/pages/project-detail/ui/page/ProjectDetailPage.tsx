import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Flex, Segmented, Skeleton, Typography, theme } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { projectQueries } from '@/entities/project';
import { PageContainer } from '@/shared/ui/PageContainer';
import { DetailPageHeader } from '@/shared/ui/DetailPageHeader';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { useProjectDetailSection, type ProjectDetailSection } from '../../model/useProjectDetailSection';
import { DocumentsSection } from '../documents/DocumentsSection';
import { DashboardSection } from '../dashboard/DashboardSection';
import { ScheduleSection } from '../schedule/ScheduleSection';
import { SettingsSection } from '../settings/SettingsSection';
import { ProjectEquipmentSection } from '../equipment/ProjectEquipmentSection';
import styles from './ProjectDetailPage.module.css';

const { Text } = Typography;
const { useToken } = theme;

export function ProjectDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const {
    data: project,
    isPending,
    isError,
  } = useQuery({
    ...projectQueries.detail(projectId ?? ''),
    enabled: Boolean(projectId),
  });
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const { section, setSection } = useProjectDetailSection(projectId);

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  if (isError || !project) {
    return (
      <PageContainer>
        <Text type="secondary">{t('projects.notFound')}</Text>
      </PageContainer>
    );
  }

  const options = [
    { label: t('projects.sections.documents'), value: 'documents' as const },
    { label: t('projects.sections.equipment'), value: 'equipment' as const },
    { label: t('projects.sections.dashboard'), value: 'dashboard' as const },
    { label: t('projects.sections.schedule'), value: 'schedule' as const },
    { label: t('projects.sections.settings'), value: 'settings' as const },
  ];

  const avatar = project.image ? (
    <Avatar shape="square" size={28} src={project.image} />
  ) : (
    <Avatar
      shape="square"
      size={28}
      style={{ backgroundColor: resolveProjectColor(project.color ?? null, project.id, isDark) }}
      icon={<ProjectOutlined />}
    />
  );

  return (
    <Flex vertical className={styles.page}>
      <DetailPageHeader
        backTo="/projects"
        backLabel={t('projects.back')}
        avatar={avatar}
        title={project.name}
        subtitle={project.code}
        sections={
          <Segmented<ProjectDetailSection> value={section} onChange={setSection} options={options} />
        }
      />

      <div className={styles.content}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={token.colorPrimary} />
        )}
        {section === 'equipment' && <ProjectEquipmentSection project={project} color={token.colorPrimary} />}
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
