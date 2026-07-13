import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Flex, Segmented, Typography, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { getEnterprise } from '../../data/enterprises';
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
  const { enterpriseId, projectId } = useParams({ strict: false }) as {
    enterpriseId?: string;
    projectId?: string;
  };
  const { openProject } = useOpenProjects();
  const enterprise = enterpriseId ? getEnterprise(enterpriseId) : undefined;
  const project = enterprise?.projects.find((p) => p.id === projectId);

  // Documentos es siempre la sección inicial al acceder.
  const [section, setSection] = useState<Section>('documents');

  // Al entrar, asegurar que el proyecto está abierto (pestaña) y activo.
  useEffect(() => {
    if (enterprise && project) openProject(enterprise.id, project.id);
  }, [enterprise, project, openProject]);

  if (!enterprise || !project) {
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
      {/* Sub-barra del proyecto: nombre + código + secciones */}
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

      {/* Contenido de la sección activa */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={enterprise.color} />
        )}
        {section === 'dashboard' && (
          <DashboardSection project={project} color={enterprise.color} />
        )}
        {section === 'settings' && (
          <SettingsSection project={project} color={enterprise.color} />
        )}
      </div>
    </Flex>
  );
}
