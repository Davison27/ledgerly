import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Flex, Segmented, Skeleton, Typography, theme } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { projectQueries } from '@/entities/project';
import { PageContainer } from '@/shared/ui/PageContainer';
import { DetailPageHeader } from '@/shared/ui/DetailPageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import {
  getAllowedProjectDetailSections,
  useProjectDetailSection,
  type ProjectDetailSection,
} from '../../model/useProjectDetailSection';
import { projectClientProjectsPath } from '../../model/projectHierarchy';
import { DocumentsSection } from '../documents/DocumentsSection';
import { DashboardSection } from '../dashboard/DashboardSection';
import { ScheduleSection } from '../schedule/ScheduleSection';
import { SettingsSection } from '../settings/SettingsSection';
import { ProjectEquipmentSection } from '../equipment/ProjectEquipmentSection';
import { useProjectFinancialSummary } from '../../model/useProjectFinancialSummary';
import { ProjectSummaryStrip } from '../projectSummary/ProjectSummaryStrip';
import { ChecklistProgressSummary } from '../checklistProgress/ChecklistProgressSummary';
import { ChecklistSection } from '../checklist/ChecklistSection';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import styles from './ProjectDetailPage.module.css';

const { Text } = Typography;
const { useToken } = theme;

export function ProjectDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { canAccess } = useWorkspaceAccess();
  const canViewProject = canAccess('projects', 'view');
  const canViewDocuments = canAccess('documents', 'view');
  const canViewEquipment = canAccess('equipment', 'view');
  const canViewDashboard = canAccess('dashboard', 'view');
  const canViewPlanning = canAccess('planning', 'view');
  const {
    data: project,
    isPending,
    isError,
  } = useQuery({
    ...projectQueries.detail(projectId ?? ''),
    enabled: Boolean(projectId) && canViewProject,
  });
  const allowedSections = getAllowedProjectDetailSections(
    {
      projects: canViewProject,
      documents: canViewDocuments,
      equipment: canViewEquipment,
      dashboard: canViewDashboard,
      calendar: canAccess('calendar', 'view'),
      planning: canViewPlanning,
    },
    project?.planningEnabled ?? false,
  );
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const financialSummary = useProjectFinancialSummary(
    projectId ?? '',
    canViewProject && canViewDashboard,
    canViewDocuments,
    canViewEquipment,
  );

  const { section, setSection } = useProjectDetailSection(projectId, allowedSections);

  if (!canViewProject) return null;

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

  if (!project.client) {
    return (
      <PageContainer>
        <EmptyHint
          icon={<ProjectOutlined />}
          title={t('projects.hierarchyUnavailable')}
          action={(
            <Button type="primary" onClick={() => void navigate({ to: '/companies' })}>
              {t('projects.hierarchyUnavailableAction')}
            </Button>
          )}
        />
      </PageContainer>
    );
  }

  const projectParentPath = projectClientProjectsPath(project);

  const labels: Record<ProjectDetailSection, string> = {
    documents: t('projects.sections.documents'),
    checklist: t('projects.sections.checklist'),
    equipment: t('projects.sections.equipment'),
    dashboard: t('projects.sections.dashboard'),
    schedule: t('projects.sections.schedule'),
    settings: t('projects.sections.settings'),
  };
  const options = allowedSections.map((value) => ({ label: labels[value], value }));

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
        backTo={projectParentPath ?? '/companies'}
        backLabel={t('projects.backToCompanies')}
        avatar={avatar}
        title={project.name}
        subtitle={project.code}
        sections={
          <Segmented<ProjectDetailSection> value={section} onChange={setSection} options={options} />
        }
      />

      {canViewDashboard ? (
        <ProjectSummaryStrip
          project={project}
          data={financialSummary.data}
          isFinancialsPending={financialSummary.isPending}
          isFinancialsError={financialSummary.isError}
          showFinancials={canViewDocuments && canViewEquipment}
          showChecklistProgress={Boolean(project.planningEnabled && canViewPlanning)}
        />
      ) : (
        project.planningEnabled && canViewPlanning && (
          <ChecklistProgressSummary project={project} standalone />
        )
      )}

      <div className={styles.content}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={token.colorPrimary} />
        )}
        {section === 'checklist' && <ChecklistSection project={project} />}
        {section === 'equipment' && <ProjectEquipmentSection project={project} color={token.colorPrimary} />}
        {section === 'dashboard' && (
          <DashboardSection
            data={financialSummary.data}
            color={token.colorPrimary}
            isPartial={financialSummary.isPartial}
          />
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
