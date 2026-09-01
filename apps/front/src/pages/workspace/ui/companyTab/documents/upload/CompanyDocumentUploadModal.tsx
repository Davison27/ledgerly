import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Form, Input, Modal, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  companyDocumentQueries,
  createCompanyDocument,
  type CompanyDocumentDto,
  type CompanyDocumentTypeDto,
} from '@/entities/company';
import { companyDocumentTypeTranslationKey } from '../model/companyDocumentLabels';
import styles from './CompanyDocumentUploadModal.module.css';

const { Dragger } = Upload;
const { Text } = Typography;
const { TextArea } = Input;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

interface CompanyDocumentUploadModalProps {
  open: boolean;
  typeId: string | null;
  documentTypes: CompanyDocumentTypeDto[];
  onCancel: () => void;
  onCreated: (document: CompanyDocumentDto) => void;
}

interface CompanyDocumentUploadFormFields {
  name?: string;
  issueDate?: Dayjs;
  expiryDate?: Dayjs;
  notes?: string;
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLocaleLowerCase().endsWith('.pdf');
}

export function CompanyDocumentUploadModal({
  open,
  typeId,
  documentTypes,
  onCancel,
  onCreated,
}: CompanyDocumentUploadModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CompanyDocumentUploadFormFields>();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedType = documentTypes.find((documentType) => documentType.id === typeId);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setFile(null);
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    setFile(null);
    onCancel();
  };

  const handleFileSelected = (candidate: File): boolean => {
    if (!isPdfFile(candidate)) {
      void message.error(t('company.documents.upload.invalidFile'));
      return false;
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      void message.error(t('company.documents.upload.fileTooLarge'));
      return false;
    }

    setFile(candidate);
    return false;
  };

  const handleOk = () => {
    if (!typeId) {
      void message.warning(t('company.documents.upload.typeRequired'));
      return;
    }

    if (!file) {
      void message.warning(t('company.documents.upload.fileRequired'));
      return;
    }

    form
      .validateFields()
      .then((values) => {
        setSubmitting(true);
        return createCompanyDocument(
          {
            typeId,
            name: values.name?.trim() || undefined,
            issueDate: values.issueDate?.format('YYYY-MM-DD'),
            expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
            notes: values.notes?.trim() || undefined,
          },
          file,
        );
      })
      .then(async (createdDocument) => {
        void message.success(t('company.documents.upload.created'));
        await queryClient.invalidateQueries({ queryKey: companyDocumentQueries.all });
        onCreated(createdDocument);
      })
      .catch(() => {
        void message.error(t('company.documents.upload.createError'));
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Modal
      open={open}
      title={t('company.documents.upload.title')}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(640px, 95vw)"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleOk}>
          {t('company.documents.upload.submit')}
        </Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        title={t('company.documents.upload.securityNotice')}
        className={styles.securityNotice}
      />
      <Form<CompanyDocumentUploadFormFields>
        form={form}
        layout="vertical"
        size="small"
        requiredMark={false}
      >
        <Form.Item label={t('company.documents.upload.fields.category')}>
          <Text>
            {selectedType
              ? t(`company.documents.types.${companyDocumentTypeTranslationKey(selectedType.code)}`, {
                  defaultValue: selectedType.name,
                })
              : t('company.documents.metadata.notAvailable')}
          </Text>
        </Form.Item>
        <Form.Item name="name" label={t('company.documents.upload.fields.name')}>
          <Input placeholder={t('company.documents.upload.placeholders.name')} />
        </Form.Item>
        <div className={styles.dateGrid}>
          <Form.Item name="issueDate" label={t('company.documents.upload.fields.issueDate')}>
            <DatePicker className={styles.fullWidth} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="expiryDate" label={t('company.documents.upload.fields.expiryDate')}>
            <DatePicker className={styles.fullWidth} format="YYYY-MM-DD" />
          </Form.Item>
        </div>
        <Form.Item name="notes" label={t('company.documents.upload.fields.notes')}>
          <TextArea rows={3} placeholder={t('company.documents.upload.placeholders.notes')} />
        </Form.Item>
        <Form.Item label={t('company.documents.upload.fields.file')}>
          <Dragger
            accept=".pdf,application/pdf"
            showUploadList={false}
            beforeUpload={handleFileSelected}
            className={styles.dragger}
          >
            <p className={`ant-upload-drag-icon ${styles.dragIcon}`}>
              <InboxOutlined />
            </p>
            <p className={`ant-upload-text ${styles.dragText}`}>
              {file ? file.name : t('company.documents.upload.dropzone.title')}
            </p>
            <p className="ant-upload-hint">{t('company.documents.upload.dropzone.hint')}</p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
}
