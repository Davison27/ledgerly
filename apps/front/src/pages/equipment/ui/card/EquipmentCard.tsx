import type { MouseEvent } from 'react';
import { App, Button, Card, Dropdown, type MenuProps, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  LoadingOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { EquipmentDto } from '@/entities/equipment';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import styles from './EquipmentCard.module.css';

const { Text } = Typography;

export interface EquipmentCardProps {
  equipment: EquipmentDto;
  canEdit: boolean;
  deleteLoading?: boolean;
  onOpen: (equipment: EquipmentDto) => void;
  onEdit: (equipment: EquipmentDto) => void;
  onDelete: (equipment: EquipmentDto) => void;
}

export function EquipmentCard({
  equipment,
  canEdit,
  deleteLoading,
  onOpen,
  onEdit,
  onDelete,
}: EquipmentCardProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();

  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('equipment.deleteConfirm.title'),
      content: t('equipment.deleteConfirm.content', { name: equipment.name }),
      okText: t('equipment.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => onDelete(equipment),
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('common.edit'),
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onEdit(equipment);
      },
    },
    {
      key: 'delete',
      danger: true,
      disabled: deleteLoading,
      icon: deleteLoading ? <LoadingOutlined /> : <DeleteOutlined />,
      label: t('common.delete'),
      onClick: (info) => {
        info.domEvent.stopPropagation();
        confirmDelete();
      },
    },
  ];

  return (
    <Card
      hoverable
      className={styles.card}
      classNames={{ body: styles.body }}
      onClick={() => onOpen(equipment)}
    >
      <div className={styles.visual}>
        {equipment.image ? (
          <img
            src={equipment.image}
            alt={t('equipment.card.imageAlt', { name: equipment.name })}
            className={styles.image}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            <InboxOutlined />
          </div>
        )}
        {canEdit ? (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button
              type="text"
              icon={<MoreOutlined />}
              aria-label={t('common.actions')}
              onClick={stopPropagation}
              className={styles.moreButton}
            />
          </Dropdown>
        ) : null}
      </div>

      <div className={styles.content}>
        <div className={styles.identity}>
          <div>
            <Text className={styles.name}>{equipment.name}</Text>
            <Text type="secondary" className={styles.reference}>
              {equipment.reference ?? '—'}
            </Text>
          </div>
          {equipment.category ? <SemanticTag tone="info">{equipment.category}</SemanticTag> : null}
        </div>

        {equipment.brand ? (
          <Text type="secondary" className={styles.brand}>
            {equipment.brand}
          </Text>
        ) : null}

        <div className={styles.metrics}>
          <div>
            <Text type="secondary" className={styles.metricLabel}>
              {t('equipment.fields.price')}
            </Text>
            <strong>
              {equipment.price === null ? '—' : <Amount value={equipment.price} strong />}
            </strong>
          </div>
          <div>
            <Text type="secondary" className={styles.metricLabel}>
              {t('equipment.fields.stock')}
            </Text>
            <strong>
              {equipment.stock === 0 ? t('equipment.stockUnset') : <Numeric>{equipment.stock}</Numeric>}
            </strong>
          </div>
        </div>

        {(equipment.leasingMonthlyFee !== null || equipment.tags.length > 0) && (
          <div className={styles.metadata}>
            {equipment.leasingMonthlyFee !== null ? (
              <span className={styles.leasing}>
                {t('equipment.card.leasing')}
                <Amount value={equipment.leasingMonthlyFee} />
              </span>
            ) : null}
            {equipment.tags.slice(0, 2).map((tag) => (
              <SemanticTag key={tag} tone="neutral">
                {tag}
              </SemanticTag>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
