import { Button, Descriptions, Image, Modal, Space, Tag, Typography } from 'antd';
import { EditOutlined, InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { EquipmentDto } from '@/entities/equipment';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { EquipmentDocumentsManager } from './documents/manager/EquipmentDocumentsManager';
import styles from './EquipmentDetailModal.module.css';

const { Paragraph, Text } = Typography;

interface EquipmentDetailModalProps {
  open: boolean;
  equipment: EquipmentDto | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (equipment: EquipmentDto) => void;
}

export function EquipmentDetailModal({ open, equipment, canEdit, onClose, onEdit }: EquipmentDetailModalProps) {
  const { t } = useTranslation();

  if (!equipment) return null;

  return (
    <Modal
      open={open}
      title={equipment.name}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.close')}</Button>
          {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(equipment)}>{t('common.edit')}</Button>}
        </Space>
      }
      centered
      width="min(760px, 95vw)"
    >
      <div className={styles.content}>
        <div className={styles.imagePanel}>
          {equipment.image ? (
            <Image preview src={equipment.image} alt={equipment.name} className={styles.image} />
          ) : (
            <div className={styles.imageFallback}><InboxOutlined /></div>
          )}
        </div>
        <div className={styles.details}>
          <Descriptions size="small" column={1}>
            {equipment.reference && <Descriptions.Item label={t('equipment.fields.reference')}>{equipment.reference}</Descriptions.Item>}
            {equipment.category && <Descriptions.Item label={t('equipment.fields.category')}>{equipment.category}</Descriptions.Item>}
            {equipment.brand && <Descriptions.Item label={t('equipment.fields.brand')}>{equipment.brand}</Descriptions.Item>}
            <Descriptions.Item label={t('equipment.fields.price')}>
              {equipment.price === null ? <Text type="secondary">—</Text> : <Amount value={equipment.price} />}
            </Descriptions.Item>
            <Descriptions.Item label={t('equipment.fields.stock')}>
              {equipment.stock === 0 ? <Text type="secondary">{t('equipment.stockUnset')}</Text> : <Numeric>{equipment.stock}</Numeric>}
            </Descriptions.Item>
            {equipment.leasingMonthlyFee !== null && (
              <Descriptions.Item label={t('equipment.fields.leasingMonthlyFee')}>
                <Amount value={equipment.leasingMonthlyFee} />
              </Descriptions.Item>
            )}
          </Descriptions>
          {equipment.tags.length > 0 && <div className={styles.tags}>{equipment.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>}
        </div>
      </div>
      {equipment.description && <div className={styles.description}><Text strong>{t('equipment.fields.description')}</Text><Paragraph>{equipment.description}</Paragraph></div>}
      <EquipmentDocumentsManager equipmentId={equipment.id} canEdit={canEdit} />
    </Modal>
  );
}
