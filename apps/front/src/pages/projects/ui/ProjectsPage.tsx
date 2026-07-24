import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, Button, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fetchProject, type Project, type ProjectFormValues } from '@/entities/project';
import { ApiError } from '@/shared/api/httpClient';
import { useCompany } from '@/entities/company';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';

const SKELETON_CARD_COUNT = 6;

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const { projects, projectsLoading, addProject, updateProject, removeProject } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

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
      const full = await fetchProject(project.id);
      setEditingProject(full);
      setIsFormOpen(true);
    } catch {
      void message.error(t('projects.form.loadError'));
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDelete = (project: Project) => {
    modal.confirm({
      title: t('projects.deleteConfirm.title'),
      content: t('projects.deleteConfirm.content', { name: project.name }),
      okText: t('projects.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeProject(project.id);
        } catch {
          void message.error(t('projects.deleteConfirm.error'));
        }
      },
    });
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
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void message.error(t('projects.form.duplicateCode'));
      } else {
        void message.error(
          editingProject ? t('projects.form.updateError') : t('projects.form.createError'),
        );
      }
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('common.add')}
          </Button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {projectsLoading ? (
          Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
            <Card key={index} loading />
          ))
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              color={resolveProjectColor(project.color ?? null, project.id, isDark)}
              editLoading={loadingEditId === project.id}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <ProjectFormModal
        open={isFormOpen}
        project={editingProject}
        onCancel={handleFormCancel}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
