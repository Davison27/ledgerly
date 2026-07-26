import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@/entities/product';

export interface ProductFormValues {
  name: string;
  price?: number;
  stock: number;
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
  const [form] = Form.useForm<ProductFormValues>();
  const isEdit = Boolean(product);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: product?.name ?? '',
        price: product?.price ?? undefined,
        stock: product?.stock ?? 0,
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
      width="min(560px, 95vw)"
    >
      <Form<ProductFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label={t('products.fields.name')}
          rules={[{ required: true, message: t('products.form.validation.nameRequired') }]}
        >
          <Input placeholder={t('products.form.placeholders.name')} />
        </Form.Item>
        <Form.Item
          name="price"
          label={t('products.fields.price')}
          extra={t('products.form.priceHelp')}
        >
          <InputNumber min={0} placeholder={t('products.form.placeholders.price')} />
        </Form.Item>
        <Form.Item
          name="stock"
          label={t('products.fields.stock')}
          style={{ marginBottom: 0 }}
          extra={t('products.form.stockHelp')}
        >
          <InputNumber precision={0} min={0} placeholder={t('products.form.placeholders.stock')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
