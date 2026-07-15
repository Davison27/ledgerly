import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, Button, Flex, Typography, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Project, ProjectFormValues } from '../../data/company';
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
  const { projects, addProject, removeProject } = useCompany();
  const { openProject, isOpen, closeProject } = useOpenProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleOpen = (project: Project) => {
    openProject(project.id);
    void navigate({
      to: '/projects/$projectId',
      params: { projectId: project.id },
    });
  };

  const handleEdit = (project: Project) => {
    void message.info(`${project.name}: ${t('common.comingSoon')}`);
  };

  const handleDelete = (project: Project) => {
    modal.confirm({
      title: t('projects.deleteConfirm.title'),
      content: t('projects.deleteConfirm.content', { name: project.name }),
      okText: t('projects.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        removeProject(project.id);
        closeProject(project.id);
      },
    });
  };

  const handleCreate = (values: ProjectFormValues) => {
    addProject(values);
    setIsFormOpen(false);
    void message.success(t('projects.form.created'));
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('projects.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsFormOpen(true)}>
          {t('common.add')}
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('projects.subtitle')}
      </Text>

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
            onOpen={handleOpen}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <ProjectFormModal
        open={isFormOpen}
        onCancel={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
