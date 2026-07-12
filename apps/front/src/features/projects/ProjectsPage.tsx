import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { App, Button, Flex, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getEnterprise } from '../../data/enterprises';
import type { Project } from '../../data/enterprises';
import { ProjectCard } from './components/ProjectCard';

const { Title, Text } = Typography;

export function ProjectsPage() {
  const { enterpriseId } = useParams({ strict: false }) as {
    enterpriseId?: string;
  };
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const enterprise = enterpriseId ? getEnterprise(enterpriseId) : undefined;
  const [projects, setProjects] = useState(enterprise?.projects ?? []);

  const handleOpen = (project: Project) => {
    void message.info(`${project.name}: ${t('common.comingSoon')}`);
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
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
      },
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}>
      <Flex align="center" justify="space-between">
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {enterprise?.name ?? t('projects.unknown')}
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => void message.info(t('common.comingSoon'))}
        >
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
            color={enterprise?.color ?? '#1c5d97'}
            onOpen={handleOpen}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
