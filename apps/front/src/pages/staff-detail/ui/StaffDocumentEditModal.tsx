import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  staffQueries,
  updateStaffDocument,
  type StaffDocumentDto,
  type StaffDocumentTypeDto,
} from '@/entities/staff-member';
import { documentQueries } from '@/entities/document';

const { TextArea } = Input;

interface StaffDocumentEditModalProps {
  open: boolean;
  staffMemberId: string;
  document: StaffDocumentDto | null;
  documentTypes: StaffDocumentTypeDto[];
  onCancel: () => void;
  onUpdated: () => void;
}

interface StaffDocumentEditFormFields {
  name: string;
  issueDate: Dayjs;
  expiryDate?: Dayjs;
  notes?: string;
}

export function StaffDocumentEditModal({
  open,
  staffMemberId,
  document,
  documentTypes,
  onCancel,
  onUpdated,
}: StaffDocumentEditModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<StaffDocumentEditFormFields>();
  const [submitting, setSubmitting] = useState(false);

  const documentType = documentTypes.find((type) => type.id === document?.typeId);
  const showExpiryDate = documentType?.expires ?? true;

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      name: document.name,
      issueDate: dayjs(document.issueDate),
      expiryDate: document.expiryDate ? dayjs(document.expiryDate) : undefined,
      notes: document.notes ?? undefined,
    });
  }, [open, document, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    if (!document) return;

    form
      .validateFields()
      .then((values) => {
        setSubmitting(true);
        updateStaffDocument(staffMemberId, document.id, {
          name: values.name,
          issueDate: values.issueDate.format('YYYY-MM-DD'),
          expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
          notes: values.notes ?? null,
        })
          .then(async () => {
            void message.success(t('staff.documents.edit.saved'));
            await queryClient.invalidateQueries({ queryKey: staffQueries.all });
            await queryClient.invalidateQueries({ queryKey: documentQueries.all });
            onUpdated();
          })
          .catch(() => {
            void message.error(t('staff.documents.edit.error'));
          })
          .finally(() => setSubmitting(false));
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={t('staff.documents.edit.title')}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(560px, 95vw)"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="ok" type="primary" loading={submitting} onClick={handleOk}>
          {t('staff.documents.edit.submit')}
        </Button>,
      ]}
    >
      <Form<StaffDocumentEditFormFields> form={form} layout="vertical" size="small" requiredMark={false}>
        <Form.Item
          name="name"
          label={t('staff.documents.upload.fields.name')}
          rules={[{ required: true, message: t('staff.documents.upload.validation.nameRequired') }]}
        >
          <Input placeholder={t('staff.documents.upload.placeholders.name')} />
        </Form.Item>
        <Form.Item
          name="issueDate"
          label={t('staff.documents.upload.fields.issueDate')}
          rules={[
            { required: true, message: t('staff.documents.upload.validation.issueDateRequired') },
          ]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        {showExpiryDate && (
          <Form.Item name="expiryDate" label={t('staff.documents.upload.fields.expiryDate')}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        )}
        <Form.Item name="notes" label={t('staff.documents.upload.fields.notes')}>
          <TextArea rows={2} placeholder={t('staff.documents.upload.placeholders.notes')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
