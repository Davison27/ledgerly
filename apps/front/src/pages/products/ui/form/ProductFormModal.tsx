import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Row, Col, Select, Upload, Button, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@/entities/product';
import styles from './ProductFormModal.module.css';

export interface ProductFormValues {
  name: string;
  price?: number;
  stock: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
}

interface ProductFormModalProps {
  open: boolean;
  product?: ProductDto | null;
  onCancel: () => void;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  submitting?: boolean;
}

export function ProductFormModal({
  open,
  product,
  onCancel,
  onSubmit,
  submitting,
}: ProductFormModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProductFormValues>();
  const isEdit = Boolean(product);
  const image = Form.useWatch('image', form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: product?.name ?? '',
        price: product?.price ?? undefined,
        stock: product?.stock ?? 0,
        reference: product?.reference ?? null,
        category: product?.category ?? null,
        brand: product?.brand ?? null,
        description: product?.description ?? null,
        image: product?.image ?? null,
        tags: product?.tags ?? [],
      });
    }
  }, [open, product, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        void onSubmit(values);
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('products.form.editTitle') : t('products.form.createTitle')}
      okText={isEdit ? t('products.form.submit') : t('products.form.createSubmit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(760px, 95vw)"
    >
      <Form<ProductFormValues> form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="image" hidden><Input /></Form.Item>
            <Form.Item label={t('products.fields.image')} className={styles.imageField}>
              <Upload
                accept="image/png,image/jpeg,image/webp"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={(file) => {
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                    void message.error(t('products.form.imageInvalid'));
                    return Upload.LIST_IGNORE;
                  }
                  const reader = new FileReader();
                  reader.onload = () => form.setFieldValue('image', typeof reader.result === 'string' ? reader.result : null);
                  reader.readAsDataURL(file);
                  return false;
                }}
              >
                {image ? <img src={image} alt={t('products.fields.image')} className={styles.imagePreview} /> : <div><InboxOutlined /><div>{t('products.form.imageUpload')}</div></div>}
              </Upload>
            </Form.Item>
            {image && <Button type="link" danger icon={<DeleteOutlined />} onClick={() => form.setFieldValue('image', null)}>{t('products.form.removeImage')}</Button>}
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="name"
              label={t('products.fields.name')}
              rules={[{ required: true, message: t('products.form.validation.nameRequired') }]}
            >
              <Input placeholder={t('products.form.placeholders.name')} />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="reference" label={t('products.fields.reference')}>
                  <Input placeholder={t('products.form.placeholders.reference')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label={t('products.fields.category')}>
                  <Input placeholder={t('products.form.placeholders.category')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="brand" label={t('products.fields.brand')}>
              <Input placeholder={t('products.form.placeholders.brand')} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t('products.fields.description')}>
          <Input.TextArea rows={3} maxLength={2000} showCount placeholder={t('products.form.placeholders.description')} />
        </Form.Item>
        <Form.Item name="tags" label={t('products.fields.tags')} extra={t('products.form.tagsHelp')}>
          <Select mode="tags" tokenSeparators={[',']} maxCount={8} placeholder={t('products.form.placeholders.tags')} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="price" label={t('products.fields.price')} extra={t('products.form.priceHelp')}>
              <InputNumber min={0} className={styles.fullWidth} placeholder={t('products.form.placeholders.price')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="stock"
              label={t('products.fields.stock')}
              className={styles.lastItem}
              extra={t('products.form.stockHelp')}
            >
              <InputNumber precision={0} min={0} className={styles.fullWidth} placeholder={t('products.form.placeholders.stock')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
