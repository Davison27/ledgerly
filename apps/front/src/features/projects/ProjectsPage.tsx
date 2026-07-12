import { useParams } from '@tanstack/react-router';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getEnterprise } from '../../data/enterprises';

const { Title, Text } = Typography;

export function ProjectsPage() {
  const { enterpriseId } = useParams({ strict: false }) as {
    enterpriseId?: string;
  };
  const { t } = useTranslation();
  const enterprise = enterpriseId ? getEnterprise(enterpriseId) : undefined;

  return (
    <div style={{ margin: '0 auto', width: '100%', maxWidth: 1080, padding: '44px 64px' }}>
      <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
        {enterprise?.name ?? t('projects.unknown')}
      </Title>
      <Text type="secondary">{t('projects.subtitle')}</Text>
    </div>
  );
}
