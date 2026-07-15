import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Flex, Segmented, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../../app/providers/CompanyProvider';
import { useOpenProjects } from '../../app/providers/OpenProjectsProvider';
import { DocumentsSection } from './sections/DocumentsSection';
import { DashboardSection } from './sections/DashboardSection';
import { SettingsSection } from './sections/SettingsSection';

const { Text } = Typography;
const { useToken } = theme;

type Section = 'documents' | 'dashboard' | 'settings';

export function ProjectDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { projects } = useCompany();
  const { openProject } = useOpenProjects();
  const project = projects.find((p) => p.id === projectId);

  const [section, setSection] = useState<Section>('documents');

  useEffect(() => {
    if (project) openProject(project.id);
  }, [project, openProject]);

  if (!project) {
    return (
      <div style={{ padding: '56px 64px' }}>
        <Text type="secondary">{t('projects.notFound')}</Text>
      </div>
    );
  }

  const options = [
    { label: t('projects.sections.documents'), value: 'documents' as const },
    { label: t('projects.sections.dashboard'), value: 'dashboard' as const },
    { label: t('projects.sections.settings'), value: 'settings' as const },
  ];

  return (
    <Flex vertical style={{ flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          flex: 'none',
          height: 56,
          padding: '0 28px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="baseline" gap={8}>
          <Text strong style={{ fontSize: 16 }}>
            {project.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {project.code}
          </Text>
        </Flex>
        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={options}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={token.colorPrimary} />
        )}
        {section === 'dashboard' && (
          <DashboardSection project={project} color={token.colorPrimary} />
        )}
        {section === 'settings' && (
          <SettingsSection project={project} color={token.colorPrimary} />
        )}
      </div>
    </Flex>
  );
}
