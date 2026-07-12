import { useNavigate } from '@tanstack/react-router';
import { Button, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { enterprises } from '../../data/enterprises';

const { Title, Text } = Typography;

export function EnterprisesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{ margin: '0 auto', width: '100%', maxWidth: 1080, padding: '56px 64px' }}>
      <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
        {t('enterprises.title')}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 36 }}>
        {t('enterprises.subtitle')}
      </Text>

      <Space wrap size={12}>
        {enterprises.map((enterprise) => (
          <Button
            key={enterprise.id}
            onClick={() =>
              void navigate({
                to: '/projects/$enterpriseId',
                params: { enterpriseId: enterprise.id },
              })
            }
          >
            {enterprise.name}
          </Button>
        ))}
      </Space>
    </div>
  );
}
