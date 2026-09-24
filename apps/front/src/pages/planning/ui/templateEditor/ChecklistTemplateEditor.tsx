import { useEffect } from 'react';
import { Button, Flex, Form, Input, Modal, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ProjectChecklistTemplateDto } from '@/entities/project-checklist';
import styles from './ChecklistTemplateEditor.module.css';

const { Text } = Typography;

export interface ChecklistTemplateFormValues {
  name: string;
  items: string[];
}

interface ChecklistTemplateEditorProps {
  open: boolean;
  template?: ProjectChecklistTemplateDto;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: ChecklistTemplateFormValues) => void | Promise<void>;
}

export function ChecklistTemplateEditor({
  open,
  template,
  saving,
  onCancel,
  onSave,
}: ChecklistTemplateEditorProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<ChecklistTemplateFormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: template?.name ?? '',
      items: template?.items.map(({ text }) => text) ?? [],
    });
  }, [form, open, template]);

  const handleSave = async () => {
    let values: ChecklistTemplateFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    await onSave(values);
  };

  return (
    <Modal
      open={open}
      title={template ? t('planning.editTitle') : t('planning.createTitle')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={() => void handleSave()}
    >
      <Form form={form} layout="vertical" initialValues={{ name: '', items: [] }}>
        <Form.Item
          name="name"
          label={t('planning.name')}
          rules={[
            { required: true, whitespace: true, message: t('planning.validation.nameRequired') },
            { max: 120, message: t('planning.validation.nameTooLong') },
          ]}
        >
          <Input maxLength={120} />
        </Form.Item>
        <div role="group" aria-label={t('planning.items')}>
          <Text strong>{t('planning.items')}</Text>
          <Form.List name="items">
            {(fields, { add, remove, move }) => (
              <Flex vertical gap={8} className={styles.itemsEditor}>
                {fields.map((field, index) => (
                  <Flex key={field.key} align="flex-start" gap={8} className={styles.itemRow}>
                    <Form.Item
                      key={field.key}
                      name={field.name}
                      label={t('planning.itemLabel', { position: index + 1 })}
                      className={styles.itemField}
                      rules={[
                        { required: true, whitespace: true, message: t('planning.validation.itemRequired') },
                        { max: 500, message: t('planning.validation.itemTooLong') },
                      ]}
                    >
                      <Input maxLength={500} />
                    </Form.Item>
                    <Button
                      icon={<ArrowUpOutlined />}
                      aria-label={t('planning.moveItemUp', { position: index + 1 })}
                      disabled={index === 0}
                      onClick={() => move(field.name, field.name - 1)}
                    />
                    <Button
                      icon={<ArrowDownOutlined />}
                      aria-label={t('planning.moveItemDown', { position: index + 1 })}
                      disabled={index === fields.length - 1}
                      onClick={() => move(field.name, field.name + 1)}
                    />
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={t('planning.removeItem', { position: index + 1 })}
                      onClick={() => remove(field.name)}
                    />
                  </Flex>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined aria-hidden="true" />}
                  onClick={() => add('')}
                >
                  {t('planning.addItem')}
                </Button>
              </Flex>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
}
