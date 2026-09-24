import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Skeleton,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  createProjectChecklistTemplate,
  deleteProjectChecklistTemplate,
  projectChecklistQueries,
  updateProjectChecklistTemplate,
  type ProjectChecklistTemplateDto,
} from '@/entities/project-checklist';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ChecklistTemplateEditor, type ChecklistTemplateFormValues } from '../templateEditor/ChecklistTemplateEditor';
import styles from './PlanningPage.module.css';

const { Text, Title } = Typography;

export function PlanningPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canView = canAccess('planning', 'view');
  const canEdit = canAccess('planning', 'edit');
  const { data: templates = [], isPending, isError, refetch } = useQuery({
    ...projectChecklistQueries.templates(),
    enabled: canView,
  });
  const [editor, setEditor] = useState<{ template?: ProjectChecklistTemplateDto } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const invalidateTemplates = () =>
    queryClient.invalidateQueries({ queryKey: projectChecklistQueries.all });

  const openCreate = () => {
    setEditor({});
  };

  const openEdit = (template: ProjectChecklistTemplateDto) => {
    setEditor({ template });
  };

  const closeEditor = () => setEditor(null);

  const saveTemplate = async (values: ChecklistTemplateFormValues) => {
    const payload = { name: values.name.trim(), items: values.items?.map((item) => item.trim()) ?? [] };
    setSaving(true);
    try {
      if (editor?.template) {
        await updateProjectChecklistTemplate(editor.template.id, payload);
        void message.success(t('planning.updated'));
      } else {
        await createProjectChecklistTemplate(payload);
        void message.success(t('planning.created'));
      }
      await invalidateTemplates();
      closeEditor();
    } catch {
      void message.error(t('planning.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (template: ProjectChecklistTemplateDto) => {
    setDeletingId(template.id);
    try {
      await deleteProjectChecklistTemplate(template.id);
      void message.success(t('planning.deleted'));
      await invalidateTemplates();
    } catch {
      void message.error(t('planning.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('planning.title')}
        subtitle={t('planning.description')}
        actions={canEdit ? (
          <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={openCreate}>
            {t('planning.createTemplate')}
          </Button>
        ) : undefined}
      />

      {isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          title={t('planning.loadError')}
          action={<Button onClick={() => void refetch()}>{t('planning.retry')}</Button>}
        />
      ) : templates.length > 0 ? (
        <Flex vertical gap={12}>
          {templates.map((template) => (
            <Card key={template.id}>
              <Flex justify="space-between" align="flex-start" gap={16} wrap>
                <div>
                  <Title level={4}>{template.name}</Title>
                  {template.items.length > 0 ? (
                    <ol className={styles.templateItems}>
                      {template.items.map((item) => <li key={item.id}>{item.text}</li>)}
                    </ol>
                  ) : (
                    <Text type="secondary">{t('planning.noItems')}</Text>
                  )}
                </div>
                {canEdit && (
                  <Flex gap={8}>
                    <Button
                      icon={<EditOutlined />}
                      aria-label={t('planning.editTemplate', { name: template.name })}
                      onClick={() => openEdit(template)}
                    />
                    <Popconfirm
                      title={t('planning.deleteConfirm.title')}
                      description={t('planning.deleteConfirm.content')}
                      okText={t('common.delete')}
                      cancelText={t('common.cancel')}
                      okButtonProps={{ danger: true, loading: deletingId === template.id }}
                      onConfirm={() => void removeTemplate(template)}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t('planning.deleteTemplate', { name: template.name })}
                      />
                    </Popconfirm>
                  </Flex>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      ) : (
        <Empty description={t('planning.empty')}>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={openCreate}>
              {t('planning.createTemplate')}
            </Button>
          )}
        </Empty>
      )}

      <ChecklistTemplateEditor
        open={editor !== null}
        template={editor?.template}
        saving={saving}
        onCancel={closeEditor}
        onSave={saveTemplate}
      />
    </PageContainer>
  );
}
