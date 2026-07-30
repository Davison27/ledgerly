import { Button, Descriptions, Image, Modal, Space, Tag, Typography } from 'antd';
import { EditOutlined, InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@/entities/product';
import { Amount } from '@/shared/ui/Amount';
import { Numeric } from '@/shared/ui/Numeric';
import styles from './ProductDetailModal.module.css';

const { Paragraph, Text } = Typography;

interface ProductDetailModalProps {
  open: boolean;
  product: ProductDto | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (product: ProductDto) => void;
}

export function ProductDetailModal({ open, product, canEdit, onClose, onEdit }: ProductDetailModalProps) {
  const { t } = useTranslation();

  if (!product) return null;

  return (
    <Modal
      open={open}
      title={product.name}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.close')}</Button>
          {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(product)}>{t('common.edit')}</Button>}
        </Space>
      }
      centered
      width="min(760px, 95vw)"
    >
      <div className={styles.content}>
        <div className={styles.imagePanel}>
          {product.image ? (
            <Image preview src={product.image} alt={product.name} className={styles.image} />
          ) : (
            <div className={styles.imageFallback}><InboxOutlined /></div>
          )}
        </div>
        <div className={styles.details}>
          <Descriptions size="small" column={1}>
            {product.reference && <Descriptions.Item label={t('products.fields.reference')}>{product.reference}</Descriptions.Item>}
            {product.category && <Descriptions.Item label={t('products.fields.category')}>{product.category}</Descriptions.Item>}
            {product.brand && <Descriptions.Item label={t('products.fields.brand')}>{product.brand}</Descriptions.Item>}
            <Descriptions.Item label={t('products.fields.price')}>
              {product.price === null ? <Text type="secondary">—</Text> : <Amount value={product.price} />}
            </Descriptions.Item>
            <Descriptions.Item label={t('products.fields.stock')}>
              {product.stock === 0 ? <Text type="secondary">{t('products.stockUnset')}</Text> : <Numeric>{product.stock}</Numeric>}
            </Descriptions.Item>
          </Descriptions>
          {product.tags.length > 0 && <div className={styles.tags}>{product.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>}
        </div>
      </div>
      {product.description && <div className={styles.description}><Text strong>{t('products.fields.description')}</Text><Paragraph>{product.description}</Paragraph></div>}
    </Modal>
  );
}
