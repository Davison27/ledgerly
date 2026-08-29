import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Skeleton,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  InboxOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  createEquipmentDocument,
  deleteEquipmentDocument,
  EQUIPMENT_DOCUMENT_MAX_FILE_SIZE_BYTES,
  equipmentDocumentFileUrl,
  equipmentDocumentQueries,
  updateEquipmentDocument,
  type EquipmentDocumentDto,
} from '@/entities/equipment';
import styles from './EquipmentDocumentsManager.module.css';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface EquipmentDocumentsManagerProps {
  equipmentId: string;
  canEdit: boolean;
}

interface EquipmentDocumentFormValues {
  name?: string;
  issueDate?: Dayjs;
  expiryDate?: Dayjs;
  notes?: string;
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLocaleLowerCase().endsWith('.pdf');
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function EquipmentDocumentsManager({ equipmentId, canEdit }: EquipmentDocumentsManagerProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<EquipmentDocumentFormValues>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<EquipmentDocumentDto | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: documents = [], isPending, isError, refetch } = useQuery(
    equipmentDocumentQueries.list(equipmentId),
  );

  useEffect(() => {
    if (!uploadOpen && !editingDocument) return;
    form.setFieldsValue(
      editingDocument
        ? {
            name: editingDocument.name,
            issueDate: editingDocument.issueDate ? dayjs(editingDocument.issueDate) : undefined,
            expiryDate: editingDocument.expiryDate ? dayjs(editingDocument.expiryDate) : undefined,
            notes: editingDocument.notes ?? undefined,
          }
        : {},
    );
  }, [editingDocument, form, uploadOpen]);

  const closeForm = () => {
    form.resetFields();
    setSelectedFile(null);
    setUploadOpen(false);
    setEditingDocument(null);
  };

  const selectFile = (file: File): boolean => {
    if (!isPdf(file)) {
      void message.error(t('equipment.documents.form.invalidFile'));
      return false;
    }
    if (file.size > EQUIPMENT_DOCUMENT_MAX_FILE_SIZE_BYTES) {
      void message.error(t('equipment.documents.form.fileTooLarge'));
      return false;
    }
    setSelectedFile(file);
    return false;
  };

  const saveDocument = async () => {
    let values: EquipmentDocumentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    if (!editingDocument && !selectedFile) {
      void message.warning(t('equipment.documents.form.fileRequired'));
      return;
    }

    setSubmitting(true);
    try {
      if (editingDocument) {
        await updateEquipmentDocument(equipmentId, editingDocument.id, {
          name: values.name?.trim() || undefined,
          issueDate: values.issueDate?.format('YYYY-MM-DD') ?? null,
          expiryDate: values.expiryDate?.format('YYYY-MM-DD') ?? null,
          notes: values.notes?.trim() || null,
        });
        void message.success(t('equipment.documents.updated'));
      } else {
        await createEquipmentDocument(
          equipmentId,
          {
            name: values.name?.trim() || undefined,
            issueDate: values.issueDate?.format('YYYY-MM-DD'),
            expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
            notes: values.notes?.trim() || undefined,
          },
          selectedFile!,
        );
        void message.success(t('equipment.documents.created'));
      }

      await queryClient.invalidateQueries({ queryKey: equipmentDocumentQueries.all });
      closeForm();
    } catch {
      void message.error(t('equipment.documents.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await deleteEquipmentDocument(equipmentId, documentId);
      await queryClient.invalidateQueries({ queryKey: equipmentDocumentQueries.all });
      void message.success(t('equipment.documents.deleted'));
    } catch {
      void message.error(t('equipment.documents.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.section}>
      <Flex align="center" justify="space-between" gap={12} wrap>
        <div>
          <Title level={5} className={styles.title}>
            {t('equipment.documents.title')}
          </Title>
          <Text type="secondary">{t('equipment.documents.subtitle')}</Text>
        </div>
        {canEdit && (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
            {t('equipment.documents.add')}
          </Button>
        )}
      </Flex>

      {isPending ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title={t('equipment.documents.loadError')}
          action={<Button onClick={() => void refetch()}>{t('equipment.documents.retry')}</Button>}
        />
      ) : documents.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('equipment.documents.empty')} />
      ) : (
        <List
          className={styles.list}
          dataSource={documents}
          renderItem={(document) => (
            <List.Item
              actions={[
                <Button
                  key="view"
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  aria-label={t('equipment.documents.view')}
                  onClick={() => window.open(equipmentDocumentFileUrl(equipmentId, document.id), '_blank', 'noopener,noreferrer')}
                />,
                ...(canEdit
                  ? [
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        aria-label={t('common.edit')}
                        onClick={() => setEditingDocument(document)}
                      />,
                      <Popconfirm
                        key="delete"
                        title={t('equipment.documents.deleteConfirm')}
                        okText={t('common.delete')}
                        cancelText={t('common.cancel')}
                        onConfirm={() => void removeDocument(document.id)}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          loading={deletingId === document.id}
                          icon={<DeleteOutlined />}
                          aria-label={t('common.delete')}
                        />
                      </Popconfirm>,
                    ]
                  : []),
              ]}
            >
              <List.Item.Meta
                avatar={<FilePdfOutlined className={styles.fileIcon} />}
                title={document.name}
                description={
                  <Flex gap={8} wrap>
                    <Text type="secondary">{document.fileName}</Text>
                    <Text type="secondary">{formatFileSize(document.fileSize)}</Text>
                    {document.issueDate && <Text type="secondary">{document.issueDate}</Text>}
                    {document.expiryDate && <Text type="secondary">{document.expiryDate}</Text>}
                  </Flex>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        open={uploadOpen || editingDocument !== null}
        title={t(editingDocument ? 'equipment.documents.form.editTitle' : 'equipment.documents.form.createTitle')}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        confirmLoading={submitting}
        onOk={() => void saveDocument()}
        onCancel={closeForm}
        destroyOnHidden
        centered
      >
        <Form<EquipmentDocumentFormValues> form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label={t('equipment.documents.form.name')}>
            <Input placeholder={t('equipment.documents.form.namePlaceholder')} />
          </Form.Item>
          <Flex gap={12} className={styles.dateFields}>
            <Form.Item name="issueDate" label={t('equipment.documents.form.issueDate')}>
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="expiryDate" label={t('equipment.documents.form.expiryDate')}>
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
          </Flex>
          <Form.Item name="notes" label={t('equipment.documents.form.notes')}>
            <TextArea rows={3} />
          </Form.Item>
          {!editingDocument && (
            <Form.Item label={t('equipment.documents.form.file')}>
              <Dragger
                accept=".pdf,application/pdf"
                showUploadList={false}
                beforeUpload={selectFile}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  {selectedFile?.name ?? t('equipment.documents.form.dropzone')}
                </p>
                <p className="ant-upload-hint">{t('equipment.documents.form.fileHint')}</p>
              </Dragger>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </section>
  );
}
