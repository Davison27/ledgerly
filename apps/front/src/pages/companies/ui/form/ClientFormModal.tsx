import { useEffect } from 'react';
import { Col, Form, Input, Modal, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ClientDto, CreateClientPayload, UpdateClientPayload } from '@/entities/client';
import styles from './ClientFormModal.module.css';

export type ClientFormValues = CreateClientPayload;

interface ClientFormModalProps {
  open: boolean;
  client?: ClientDto | null;
  onCancel: () => void;
  onSubmit: (values: ClientFormValues | UpdateClientPayload) => void | Promise<void>;
  submitting?: boolean;
}

export function ClientFormModal({
  open,
  client,
  onCancel,
  onSubmit,
  submitting = false,
}: ClientFormModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ClientFormValues>();
  const isEdit = Boolean(client);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: client?.name ?? '',
      taxId: client?.taxId ?? undefined,
      contactName: client?.contactName ?? undefined,
      contactEmail: client?.contactEmail ?? undefined,
      contactPhone: client?.contactPhone ?? undefined,
    });
  }, [client, form, open]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => onSubmit(values))
      .catch(() => undefined);
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('companies.form.editTitle') : t('companies.form.createTitle')}
      okText={isEdit ? t('companies.form.save') : t('companies.form.createSubmit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(720px, 95vw)"
      classNames={{ body: styles.body }}
    >
      <Form<ClientFormValues> form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label={t('companies.form.fields.name')}
              rules={[{ required: true, message: t('companies.form.validation.nameRequired') }]}
            >
              <Input placeholder={t('companies.form.placeholders.name')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="taxId" label={t('companies.form.fields.taxId')}>
              <Input placeholder={t('companies.form.placeholders.taxId')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="contactName" label={t('companies.form.fields.contactName')}>
              <Input placeholder={t('companies.form.placeholders.contactName')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="contactEmail"
              label={t('companies.form.fields.contactEmail')}
              rules={[{ type: 'email', message: t('companies.form.validation.emailInvalid') }]}
            >
              <Input type="email" placeholder={t('companies.form.placeholders.contactEmail')} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="contactPhone" label={t('companies.form.fields.contactPhone')}>
          <Input placeholder={t('companies.form.placeholders.contactPhone')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
