import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Flex, Skeleton, Switch } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  addProject,
  projectQueries,
  removeProject,
  unarchiveProject,
  updateProject,
  type Project,
  type ProjectFormValues,
} from '@/entities/project';
import { clientQueries, parentClientError } from '@/entities/client';
import { documentQueries } from '@/entities/document';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { ProjectCard } from '../card/ProjectCard';
import { ProjectFormModal } from '../form/ProjectFormModal';
import styles from './ProjectsPage.module.css';
import { projectDeletionMessageKey, visibleProjects } from '../../model/projectsPage';

const SKELETON_CARD_COUNT = 6;

function ProjectCardSkeleton() {
  return (
    <Card className={styles.skeletonCard} classNames={{ body: styles.skeletonBody }}>
      <Skeleton.Avatar active size={52} shape="square" />
      <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1, width: ['38%'] }} />
      <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: ['80%'] }} />
      <Skeleton active title={{ width: '72%' }} paragraph={{ rows: 1, width: ['100%'] }} />
    </Card>
  );
}

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clientId } = useParams({ strict: false }) as { clientId?: string };
  const isScoped = Boolean(clientId);
  const { message } = App.useApp();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const queryClient = useQueryClient();
  const { data: parentClient, isPending: parentClientLoading, isError: parentClientLoadError } = useQuery({
    ...clientQueries.detail(clientId ?? ''),
    enabled: isScoped,
  });
  const { data: projects, isPending: projectsLoading } = useQuery(projectQueries.list(clientId));
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('projects', 'edit');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visibleProjectList = visibleProjects(projects ?? [], showArchived);
  const clientArchived = Boolean(parentClient?.archivedAt);
  const canCreate = canEdit && (!isScoped || (Boolean(parentClient) && !clientArchived));
  const companyBackLink = isScoped ? (
    <Link to="/companies" className={styles.backLink}>
      <ArrowLeftOutlined aria-hidden="true" />
      <span>{t('nav.companies')}</span>
    </Link>
  ) : null;
  const pageTitle =
    isScoped && parentClient && !parentClientLoadError
      ? `${t('projects.title')} · ${parentClient.name}`
      : t('projects.title');

  const invalidateProjectViews = async (projectId?: string, oldClientId?: string, newClientId?: string) => {
    const scopedClientIds = [...new Set([oldClientId, newClientId].filter((id): id is string => Boolean(id)))];
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectQueries.all }),
      queryClient.invalidateQueries({ queryKey: clientQueries.all }),
      queryClient.invalidateQueries({ queryKey: documentQueries.all }),
      ...(projectId
        ? [queryClient.invalidateQueries({ queryKey: projectQueries.detail(projectId).queryKey })]
        : []),
      ...scopedClientIds.map((id) =>
        queryClient.invalidateQueries({ queryKey: projectQueries.list(id).queryKey }),
      ),
    ]);
  };

  const handleOpen = (project: Project) => {
    void navigate({
      to: '/projects/$projectId',
      params: { projectId: project.id },
    });
  };

  const handleCreate = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEdit = async (project: Project) => {
    setLoadingEditId(project.id);
    try {
      const full = await queryClient.fetchQuery(projectQueries.detail(project.id));
      setEditingProject(full);
      setIsFormOpen(true);
    } catch {
      void message.error(t('projects.form.loadError'));
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDelete = async (project: Project) => {
    setDeletingId(project.id);
    try {
      const outcome = await removeProject(project.id);
      void message.success(t(projectDeletionMessageKey(outcome)));
      await invalidateProjectViews(project.id, clientId);
    } catch {
      void message.error(t('projects.deleteConfirm.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUnarchive = async (project: Project) => {
    setUnarchivingId(project.id);
    try {
      await unarchiveProject(project.id);
      void message.success(t('projects.unarchived'));
      await invalidateProjectViews(project.id, clientId);
    } catch {
      void message.error(t('projects.deleteConfirm.error'));
    } finally {
      setUnarchivingId(null);
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, values);
        void message.success(t('projects.form.updated'));
      } else {
        await addProject(values);
        void message.success(t('projects.form.created'));
      }
      await invalidateProjectViews(
        editingProject?.id,
        editingProject?.clientId,
        values.clientId,
      );
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      if (parentClientError(error)) throw error;
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('projects.form.duplicateCode'));
      } else {
        void message.error(
          editingProject ? t('projects.form.updateError') : t('projects.form.createError'),
        );
      }
    }
  };

  if (isScoped && parentClientLoadError) {
    return (
      <PageContainer>
        {companyBackLink}
        <PageHeader title={t('projects.title')} />
        <EmptyHint
          icon={<ProjectOutlined />}
          title={t('companies.notFound')}
        />
      </PageContainer>
    );
  }

  if (isScoped && parentClientLoading) {
    return (
      <PageContainer>
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {companyBackLink}
      <PageHeader
        title={pageTitle}
        subtitle={isScoped ? t('projects.subtitle') : t('projects.subtitle')}
        actions={
          canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              {t('common.add')}
            </Button>
          ) : undefined
        }
      />

      {projectsLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : (projects ?? []).length === 0 ? (
        <EmptyHint
          icon={<ProjectOutlined />}
          title={t('projects.empty')}
          action={
            canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                {t('common.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Flex align="center" justify="flex-end" gap={8} className={styles.filters}>
            <Switch
              checked={showArchived}
              onChange={setShowArchived}
              aria-label={t('common.showArchived')}
            />
            <span>{t('common.showArchived')}</span>
          </Flex>
          {visibleProjectList.length === 0 ? (
            <EmptyHint icon={<ProjectOutlined />} title={t('common.noSearchResults')} />
          ) : (
            <div className={styles.grid}>
              {visibleProjectList.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  color={resolveProjectColor(project.color ?? null, project.id, isDark)}
                  editLoading={loadingEditId === project.id}
                  deleteLoading={deletingId === project.id}
                  unarchiveLoading={unarchivingId === project.id}
                  canEdit={canEdit}
                  onOpen={handleOpen}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUnarchive={handleUnarchive}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ProjectFormModal
        open={isFormOpen}
        project={editingProject}
        scopedClientId={!editingProject && isScoped ? clientId : undefined}
        scopedClientName={!editingProject ? parentClient?.name : undefined}
        onCancel={handleFormCancel}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
