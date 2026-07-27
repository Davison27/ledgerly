import { useEffect } from 'react';
import { Col, Form, Input, Modal, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SupplierDto } from '@/entities/supplier';
import styles from './SupplierFormModal.module.css';

const { TextArea } = Input;

export interface SupplierFormValues {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}

interface SupplierFormModalProps {
  open: boolean;
  supplier?: SupplierDto | null;
  onCancel: () => void;
  onSubmit: (values: SupplierFormValues) => void | Promise<void>;
  submitting?: boolean;
}

export function SupplierFormModal({
  open,
  supplier,
  onCancel,
  onSubmit,
  submitting,
}: SupplierFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<SupplierFormValues>();
  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: supplier?.name ?? '',
        taxId: supplier?.taxId ?? undefined,
        email: supplier?.email ?? undefined,
        phone: supplier?.phone ?? undefined,
        address: supplier?.address ?? undefined,
        iban: supplier?.iban ?? undefined,
        notes: supplier?.notes ?? undefined,
      });
    }
  }, [open, supplier, form]);

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
      title={isEdit ? t('suppliers.form.editTitle') : t('suppliers.form.createTitle')}
      okText={isEdit ? t('suppliers.form.submit') : t('suppliers.form.createSubmit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(720px, 95vw)"
    >
      <Form<SupplierFormValues> form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label={t('suppliers.fields.name')}
              rules={[{ required: true, message: t('suppliers.form.validation.nameRequired') }]}
            >
              <Input placeholder={t('suppliers.form.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="taxId" label={t('suppliers.fields.taxId')}>
              <Input placeholder={t('suppliers.form.placeholders.taxId')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label={t('suppliers.fields.email')}
              rules={[{ type: 'email', message: t('suppliers.form.validation.emailInvalid') }]}
            >
              <Input type="email" placeholder={t('suppliers.form.placeholders.email')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label={t('suppliers.fields.phone')}>
              <Input placeholder={t('suppliers.form.placeholders.phone')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="address" label={t('suppliers.fields.address')}>
              <Input placeholder={t('suppliers.form.placeholders.address')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="iban" label={t('suppliers.fields.iban')}>
              <Input placeholder={t('suppliers.form.placeholders.iban')} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label={t('suppliers.fields.notes')} className={styles.lastItem}>
          <TextArea rows={3} placeholder={t('suppliers.form.placeholders.notes')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
