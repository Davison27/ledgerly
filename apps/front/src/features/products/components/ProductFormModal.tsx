import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '../../../data/api/types';

export interface ProductFormValues {
  name: string;
  price?: number;
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
      .catch(() => {
        // validation errors are shown inline by antd
      });
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
          style={{ marginBottom: 12 }}
          rules={[{ required: true, message: t('products.form.validation.nameRequired') }]}
        >
          <Input placeholder={t('products.form.placeholders.name')} />
        </Form.Item>
        <Form.Item
          name="price"
          label={t('products.fields.price')}
          style={{ marginBottom: 0 }}
          extra={t('products.form.priceHelp')}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder={t('products.form.placeholders.price')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
