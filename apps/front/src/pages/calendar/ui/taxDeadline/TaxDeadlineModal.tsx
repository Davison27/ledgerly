import dayjs from 'dayjs';
import { Descriptions, Modal, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';

const { Paragraph, Text, Title } = Typography;

export interface TaxDeadlineModalProps {
  open: boolean;
  deadline: TaxDeadlineDto | null;
  onClose: () => void;
}

function formatDate(value: string): string {
  return dayjs(value).format('DD/MM/YYYY');
}

export function TaxDeadlineModal({ open, deadline, onClose }: TaxDeadlineModalProps) {
  const { t } = useTranslation();

  if (!deadline) return null;

  return (
    <Modal open={open} title={deadline.title} onCancel={onClose} footer={null} destroyOnHidden>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5} style={{ marginBlock: 0 }}>
            {deadline.projectName}
          </Title>
          <Text type="secondary">{deadline.code}</Text>
        </div>

        <Paragraph style={{ marginBlock: 0 }}>{deadline.description}</Paragraph>

        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label={t('calendar.tax.modal.dueDate')}>
            <Text strong>{formatDate(deadline.dueDate)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('calendar.tax.modal.period')}>
            {formatDate(deadline.periodStart)} – {formatDate(deadline.periodEnd)}
          </Descriptions.Item>
          <Descriptions.Item label={t('calendar.tax.modal.status')}>
            <Tag color="purple">{t(`calendar.tax.status.${deadline.status}`)}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Text type="secondary">
          {t('calendar.tax.modal.source')}:{' '}
          <a href={deadline.sourceUrl} target="_blank" rel="noreferrer">
            {t('calendar.tax.modal.openSource')}
          </a>
          {' · '}
          {t('calendar.tax.modal.sourceVersion', { version: deadline.sourceVersion })}
        </Text>
      </Space>
    </Modal>
  );
}
