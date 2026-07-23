import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Avatar, Flex, Segmented, Typography, theme } from 'antd';
import { ProjectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCompany } from '@/entities/company';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { PageContainer } from '@/shared/ui/PageContainer';
import { resolveProjectColor } from '@/shared/lib/palette';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { DocumentsSection } from './DocumentsSection';
import { DashboardSection } from './DashboardSection';
import { ScheduleSection } from './ScheduleSection';
import { SettingsSection } from './SettingsSection';

const { Text } = Typography;
const { useToken } = theme;

type Section = 'documents' | 'dashboard' | 'schedule' | 'settings';

export function ProjectDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const { projects } = useCompany();
  const project = projects.find((p) => p.id === projectId);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [section, setSection] = useState<Section>('documents');

  if (!project) {
    return (
      <PageContainer>
        <Text type="secondary">{t('projects.notFound')}</Text>
      </PageContainer>
    );
  }

  const options = [
    { label: t('projects.sections.documents'), value: 'documents' as const },
    { label: t('projects.sections.dashboard'), value: 'dashboard' as const },
    { label: t('projects.sections.schedule'), value: 'schedule' as const },
    { label: t('projects.sections.settings'), value: 'settings' as const },
  ];

  return (
    <Flex vertical style={{ flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.xxl,
          flex: 'none',
          height: LAYOUT.sectionHeaderHeight,
          padding: `0 ${LAYOUT.pagePaddingInline}px`,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
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
            <Text strong style={{ fontSize: 16 }}>
              {project.name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {section === 'documents' && (
          <DocumentsSection project={project} color={token.colorPrimary} />
        )}
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
