import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  companyDocumentQueries,
  updateCompanyDocument,
  type CompanyDocumentDto,
  type CompanyDocumentTypeDto,
} from '@/entities/company';
import styles from './CompanyDocumentEditModal.module.css';

const { TextArea } = Input;

interface CompanyDocumentEditModalProps {
  open: boolean;
  document: CompanyDocumentDto | null;
  documentTypes: CompanyDocumentTypeDto[];
  onCancel: () => void;
  onUpdated: (document: CompanyDocumentDto) => void;
}

interface CompanyDocumentEditFormFields {
  name?: string;
  issueDate?: Dayjs;
  expiryDate?: Dayjs;
  notes?: string;
}

export function CompanyDocumentEditModal({
  open,
  document,
  documentTypes,
  onCancel,
  onUpdated,
}: CompanyDocumentEditModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CompanyDocumentEditFormFields>();
  const [submitting, setSubmitting] = useState(false);
  const documentType = documentTypes.find((type) => type.id === document?.typeId);
  const showExpiryDate = documentType?.expires !== false;

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      name: document.name,
      issueDate: document.issueDate ? dayjs(document.issueDate) : undefined,
      expiryDate: document.expiryDate ? dayjs(document.expiryDate) : undefined,
      notes: document.notes ?? undefined,
    });
  }, [open, document, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = async () => {
    if (!document) return;

    let values: CompanyDocumentEditFormFields;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSubmitting(true);
    try {
      const updatedDocument = await updateCompanyDocument(document.id, {
        name: values.name?.trim() || undefined,
        issueDate: values.issueDate?.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate?.format('YYYY-MM-DD') ?? null,
        notes: values.notes?.trim() || null,
      });
      void message.success(t('company.documents.edit.saved'));
      await queryClient.invalidateQueries({ queryKey: companyDocumentQueries.all });
      onUpdated(updatedDocument);
    } catch {
      void message.error(t('company.documents.edit.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('company.documents.edit.title')}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(560px, 95vw)"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={() => void handleOk()}>
          {t('company.documents.edit.submit')}
        </Button>,
      ]}
    >
      <Form<CompanyDocumentEditFormFields>
        form={form}
        layout="vertical"
        size="small"
        requiredMark={false}
      >
        <Form.Item name="name" label={t('company.documents.upload.fields.name')}>
          <Input placeholder={t('company.documents.upload.placeholders.name')} />
        </Form.Item>
        <div className={showExpiryDate ? styles.dateGrid : styles.singleField}>
          <Form.Item name="issueDate" label={t('company.documents.upload.fields.issueDate')}>
            <DatePicker className={styles.fullWidth} format="YYYY-MM-DD" />
          </Form.Item>
          {showExpiryDate && (
            <Form.Item name="expiryDate" label={t('company.documents.upload.fields.expiryDate')}>
              <DatePicker className={styles.fullWidth} format="YYYY-MM-DD" />
            </Form.Item>
          )}
        </div>
        <Form.Item name="notes" label={t('company.documents.upload.fields.notes')}>
          <TextArea rows={3} placeholder={t('company.documents.upload.placeholders.notes')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
