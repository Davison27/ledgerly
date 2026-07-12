import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { App, Button, Flex, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { enterprises as initialEnterprises } from '../../data/enterprises';
import type { Enterprise } from '../../data/enterprises';
import { EnterpriseCard } from './components/EnterpriseCard';

const { Title, Text } = Typography;

export function EnterprisesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [enterprises, setEnterprises] = useState(initialEnterprises);

  const handleOpen = (enterprise: Enterprise) => {
    void navigate({
      to: '/projects/$enterpriseId',
      params: { enterpriseId: enterprise.id },
    });
  };

  const handleEdit = (enterprise: Enterprise) => {
    void message.info(`${enterprise.name}: ${t('common.comingSoon')}`);
  };

  const handleDelete = (enterprise: Enterprise) => {
    modal.confirm({
      title: t('enterprises.deleteConfirm.title'),
      content: t('enterprises.deleteConfirm.content', {
        name: enterprise.name,
      }),
      okText: t('enterprises.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        setEnterprises((prev) => prev.filter((e) => e.id !== enterprise.id));
      },
    });
  };

  return (
    <div
      style={{ width: '100%', maxWidth: '100%', padding: '56px 64px' }}
    >
      <Flex align="center" justify="space-between" style={{ height: '100%' }}>
        <Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
          {t('enterprises.title')}
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
        {t('enterprises.subtitle')}
      </Text>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {enterprises.map((enterprise) => (
          <EnterpriseCard
            key={enterprise.id}
            enterprise={enterprise}
            onOpen={handleOpen}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
