import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Select, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { createStaffDocument, staffQueries, type StaffDocumentTypeDto } from '@/entities/staff-member';
import { documentQueries } from '@/entities/document';

const { Dragger } = Upload;
const { TextArea } = Input;

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_MIME_TYPES.includes(file.type);
}

interface StaffDocumentUploadModalProps {
  open: boolean;
  staffMemberId: string;
  documentTypes: StaffDocumentTypeDto[];
  initialTypeId?: string;
  onCancel: () => void;
  onCreated: () => void;
}

interface StaffDocumentFormFields {
  typeId: string;
  name: string;
  issueDate: Dayjs;
  expiryDate?: Dayjs;
  notes?: string;
}

export function StaffDocumentUploadModal({
  open,
  staffMemberId,
  documentTypes,
  initialTypeId,
  onCancel,
  onCreated,
}: StaffDocumentUploadModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<StaffDocumentFormFields>();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFile(null);
      if (initialTypeId) {
        form.setFieldsValue({ typeId: initialTypeId });
      }
    }
  }, [open, initialTypeId, form]);

  const typeIdWatch = Form.useWatch('typeId', form);
  const issueDateWatch = Form.useWatch('issueDate', form);
  const selectedType = documentTypes.find((type) => type.id === typeIdWatch);
  const showExpiryDate = selectedType?.expires ?? true;

  useEffect(() => {
    if (!selectedType?.defaultValidityMonths || !issueDateWatch) return;
    if (form.getFieldValue('expiryDate')) return;
    form.setFieldsValue({
      expiryDate: issueDateWatch.add(selectedType.defaultValidityMonths, 'month'),
    });
  }, [selectedType, issueDateWatch, form]);

  const handleCancel = () => {
    form.resetFields();
    setFile(null);
    onCancel();
  };

  const handleFileSelected = (candidate: File): boolean => {
    if (!isAcceptedFile(candidate)) {
      void message.error(t('staff.documents.upload.invalidFile'));
      return false;
    }
    setFile(candidate);
    return false;
  };

  const handleOk = () => {
    if (!file) {
      void message.warning(t('staff.documents.upload.fileRequired'));
      return;
    }

    form
      .validateFields()
      .then((values) => {
        setSubmitting(true);
        createStaffDocument(
          staffMemberId,
          {
            typeId: values.typeId,
            name: values.name,
            issueDate: values.issueDate.format('YYYY-MM-DD'),
            expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
            notes: values.notes,
          },
          file,
        )
          .then(async () => {
            void message.success(t('staff.documents.upload.created'));
            await queryClient.invalidateQueries({ queryKey: staffQueries.all });
            await queryClient.invalidateQueries({ queryKey: documentQueries.all });
            onCreated();
          })
          .catch(() => {
            void message.error(t('staff.documents.upload.createError'));
          })
          .finally(() => setSubmitting(false));
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      title={t('staff.documents.upload.title')}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(640px, 95vw)"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="ok" type="primary" loading={submitting} onClick={handleOk}>
          {t('staff.documents.upload.submit')}
        </Button>,
      ]}
    >
      <Form<StaffDocumentFormFields> form={form} layout="vertical" size="small" requiredMark={false}>
        <Form.Item
          name="typeId"
          label={t('staff.documents.upload.fields.type')}
          rules={[{ required: true, message: t('staff.documents.upload.validation.typeRequired') }]}
        >
          <Select
            options={documentTypes.map((type) => ({
              value: type.id,
              label: t(`staff.documentTypes.${type.code}`, { defaultValue: type.name }),
            }))}
          />
        </Form.Item>
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
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>
        {showExpiryDate && (
          <Form.Item name="expiryDate" label={t('staff.documents.upload.fields.expiryDate')}>
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>
        )}
        <Form.Item name="notes" label={t('staff.documents.upload.fields.notes')}>
          <TextArea rows={2} placeholder={t('staff.documents.upload.placeholders.notes')} />
        </Form.Item>
        <Form.Item label={t('staff.documents.upload.fields.file')}>
          <Dragger
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            showUploadList={false}
            beforeUpload={handleFileSelected}
            style={{ padding: '8px 0' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
              <InboxOutlined />
            </p>
            <p className="ant-upload-text" style={{ marginBottom: 2 }}>
              {file ? file.name : t('staff.documents.upload.dropzone.title')}
            </p>
            <p className="ant-upload-hint">{t('staff.documents.upload.dropzone.hint')}</p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
