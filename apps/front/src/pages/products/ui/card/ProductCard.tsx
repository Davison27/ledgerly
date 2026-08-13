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
import type { ProductDto } from '@/entities/product';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import styles from './ProductCard.module.css';

const { Text } = Typography;

export interface ProductCardProps {
  product: ProductDto;
  canEdit: boolean;
  deleteLoading?: boolean;
  onOpen: (product: ProductDto) => void;
  onEdit: (product: ProductDto) => void;
  onDelete: (product: ProductDto) => void;
}

export function ProductCard({
  product,
  canEdit,
  deleteLoading,
  onOpen,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const { t } = useTranslation();
  const { modal } = App.useApp();

  const stopPropagation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const confirmDelete = () => {
    modal.confirm({
      title: t('products.deleteConfirm.title'),
      content: t('products.deleteConfirm.content', { name: product.name }),
      okText: t('products.deleteConfirm.ok'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => onDelete(product),
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('common.edit'),
      onClick: (info) => {
        info.domEvent.stopPropagation();
        onEdit(product);
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
      onClick={() => onOpen(product)}
    >
      <div className={styles.visual}>
        {product.image ? (
          <img
            src={product.image}
            alt={t('products.card.imageAlt', { name: product.name })}
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
            <Text className={styles.name}>{product.name}</Text>
            <Text type="secondary" className={styles.reference}>
              {product.reference ?? '—'}
            </Text>
          </div>
          {product.category ? <SemanticTag tone="info">{product.category}</SemanticTag> : null}
        </div>

        {product.brand ? (
          <Text type="secondary" className={styles.brand}>
            {product.brand}
          </Text>
        ) : null}

        <div className={styles.metrics}>
          <div>
            <Text type="secondary" className={styles.metricLabel}>
              {t('products.fields.price')}
            </Text>
            <strong>
              {product.price === null ? '—' : <Amount value={product.price} strong />}
            </strong>
          </div>
          <div>
            <Text type="secondary" className={styles.metricLabel}>
              {t('products.fields.stock')}
            </Text>
            <strong>
              {product.stock === 0 ? t('products.stockUnset') : <Numeric>{product.stock}</Numeric>}
            </strong>
          </div>
        </div>

        {(product.leasingMonthlyFee !== null || product.tags.length > 0) && (
          <div className={styles.metadata}>
            {product.leasingMonthlyFee !== null ? (
              <span className={styles.leasing}>
                {t('products.card.leasing')}
                <Amount value={product.leasingMonthlyFee} />
              </span>
            ) : null}
            {product.tags.slice(0, 2).map((tag) => (
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
