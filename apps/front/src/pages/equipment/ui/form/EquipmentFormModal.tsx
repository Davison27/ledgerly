import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Row, Col, Select, Upload, Button, App } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { EquipmentDto } from '@/entities/equipment';
import styles from './EquipmentFormModal.module.css';

export interface EquipmentFormValues {
  name: string;
  price?: number;
  stock: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
  leasingMonthlyFee?: number | null;
}

interface EquipmentFormModalProps {
  open: boolean;
  equipment?: EquipmentDto | null;
  onCancel: () => void;
  onSubmit: (values: EquipmentFormValues) => void | Promise<void>;
  submitting?: boolean;
}

export function EquipmentFormModal({
  open,
  equipment,
  onCancel,
  onSubmit,
  submitting,
}: EquipmentFormModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<EquipmentFormValues>();
  const isEdit = Boolean(equipment);
  const image = Form.useWatch('image', form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: equipment?.name ?? '',
        price: equipment?.price ?? undefined,
        stock: equipment?.stock ?? 0,
        reference: equipment?.reference ?? null,
        category: equipment?.category ?? null,
        brand: equipment?.brand ?? null,
        description: equipment?.description ?? null,
        image: equipment?.image ?? null,
        tags: equipment?.tags ?? [],
        leasingMonthlyFee: equipment?.leasingMonthlyFee ?? undefined,
      });
    }
  }, [open, equipment, form]);

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
      title={isEdit ? t('equipment.form.editTitle') : t('equipment.form.createTitle')}
      okText={isEdit ? t('equipment.form.submit') : t('equipment.form.createSubmit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(760px, 95vw)"
    >
      <Form<EquipmentFormValues> form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="image" hidden><Input /></Form.Item>
            <Form.Item label={t('equipment.fields.image')} className={styles.imageField}>
              <Upload
                accept="image/png,image/jpeg,image/webp"
                listType="picture-card"
                showUploadList={false}
                beforeUpload={(file) => {
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                    void message.error(t('equipment.form.imageInvalid'));
                    return Upload.LIST_IGNORE;
                  }
                  const reader = new FileReader();
                  reader.onload = () => form.setFieldValue('image', typeof reader.result === 'string' ? reader.result : null);
                  reader.readAsDataURL(file);
                  return false;
                }}
              >
                {image ? <img src={image} alt={t('equipment.fields.image')} className={styles.imagePreview} /> : <div><InboxOutlined /><div>{t('equipment.form.imageUpload')}</div></div>}
              </Upload>
            </Form.Item>
            {image && <Button type="link" danger icon={<DeleteOutlined />} onClick={() => form.setFieldValue('image', null)}>{t('equipment.form.removeImage')}</Button>}
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="name"
              label={t('equipment.fields.name')}
              rules={[{ required: true, message: t('equipment.form.validation.nameRequired') }]}
            >
              <Input placeholder={t('equipment.form.placeholders.name')} />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="reference" label={t('equipment.fields.reference')}>
                  <Input placeholder={t('equipment.form.placeholders.reference')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label={t('equipment.fields.category')}>
                  <Input placeholder={t('equipment.form.placeholders.category')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="brand" label={t('equipment.fields.brand')}>
              <Input placeholder={t('equipment.form.placeholders.brand')} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label={t('equipment.fields.description')}>
          <Input.TextArea rows={3} maxLength={2000} showCount placeholder={t('equipment.form.placeholders.description')} />
        </Form.Item>
        <Form.Item name="tags" label={t('equipment.fields.tags')} extra={t('equipment.form.tagsHelp')}>
          <Select mode="tags" tokenSeparators={[',']} maxCount={8} placeholder={t('equipment.form.placeholders.tags')} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="price" label={t('equipment.fields.price')} extra={t('equipment.form.priceHelp')}>
              <InputNumber min={0} className={styles.fullWidth} placeholder={t('equipment.form.placeholders.price')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="leasingMonthlyFee" label={t('equipment.fields.leasingMonthlyFee')} extra={t('equipment.form.leasingMonthlyFeeHelp')}>
              <InputNumber min={0} className={styles.fullWidth} placeholder={t('equipment.form.placeholders.leasingMonthlyFee')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="stock"
              label={t('equipment.fields.stock')}
              className={styles.lastItem}
              extra={t('equipment.form.stockHelp')}
            >
              <InputNumber precision={0} min={0} className={styles.fullWidth} placeholder={t('equipment.form.placeholders.stock')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
