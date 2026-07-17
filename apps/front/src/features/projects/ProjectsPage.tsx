import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, Button, Flex, Spin, Typography, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fetchProject, type Project, type ProjectFormValues } from '../../data/company';
import { ApiError } from '../../data/api/httpClient';
import { useCompany } from '../../app/providers/CompanyProvider';
import { useOpenProjects } from '../../app/providers/OpenProjectsProvider';
import { ProjectCard } from './components/ProjectCard';
import { ProjectFormModal } from './components/ProjectFormModal';

const { Title, Text } = Typography;

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const { projects, projectsLoading, addProject, updateProject, removeProject } = useCompany();
  const { openProject, isOpen, closeProject } = useOpenProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const handleOpen = (project: Project) => {
    openProject(project.id);
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
          closeProject(project.id);
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
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('projects.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('common.add')}
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('projects.subtitle')}
      </Text>

      {projectsLoading ? (
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              color={token.colorPrimary}
              isOpen={isOpen(project.id)}
              editLoading={loadingEditId === project.id}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={isFormOpen}
        project={editingProject}
        onCancel={handleFormCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
