import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Checkbox, Flex, Input, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  addProjectChecklistItem,
  deleteProjectChecklistItem,
  projectChecklistQueries,
  updateProjectChecklistItem,
  type ProjectChecklistDto,
  type ProjectChecklistItemDto,
} from '@/entities/project-checklist';
import { projectQueries, type Project } from '@/entities/project';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { EmptyHint } from '@/shared/ui/EmptyHint';
import styles from './ChecklistSection.module.css';

const { Title, Text } = Typography;

interface ChecklistSectionProps {
  project: Project;
}

export function ChecklistSection({ project }: ChecklistSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canAccess } = useWorkspaceAccess();
  const canView = canAccess('projects', 'view') && canAccess('planning', 'view');
  const canEdit = canAccess('projects', 'edit') && canAccess('planning', 'edit');
  const query = projectChecklistQueries.project(project.id);
  const { data: checklist, isPending, isError } = useQuery({ ...query, enabled: canView });
  const [newItemText, setNewItemText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string>();
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async (updated?: ProjectChecklistDto) => {
    if (updated) queryClient.setQueryData(query.queryKey, updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: query.queryKey }),
      queryClient.invalidateQueries({ queryKey: projectQueries.all }),
    ]);
  };

  const runMutation = async (
    mutation: () => Promise<ProjectChecklistDto | void>,
    errorKey: string,
  ): Promise<boolean> => {
    if (!canEdit || saving) return false;
    setSaving(true);
    try {
      const updated = await mutation();
      if (updated) await refresh(updated);
      else await refresh();
      return true;
    } catch {
      void message.error(t(errorKey));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    void runMutation(
      () => addProjectChecklistItem(project.id, text),
      'projects.planning.addError',
    ).then((saved) => {
      if (saved) setNewItemText('');
    });
  };

  const updateItem = (item: ProjectChecklistItemDto, payload: { text?: string; completed?: boolean; position?: number }) => {
    void runMutation(
      () => updateProjectChecklistItem(project.id, item.id, payload),
      'projects.planning.updateError',
    );
  };

  const saveEditedItem = (item: ProjectChecklistItemDto) => {
    const text = editingText.trim();
    if (!text) return;
    void runMutation(
      () => updateProjectChecklistItem(project.id, item.id, { text }),
      'projects.planning.updateError',
    ).then((saved) => {
      if (saved) setEditingItemId(undefined);
    });
  };

  if (!canView) return null;

  return (
    <PageContainer>
      {isPending ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : isError || !checklist ? (
        <Alert type="error" showIcon title={t('projects.planning.loadError')} />
      ) : (
        <Flex vertical gap={20}>
          <Flex align="center" justify="space-between" wrap gap={12}>
            <div>
              <Title level={4} className={styles.title}>{checklist.name}</Title>
              <Text type="secondary">
                {t('projects.planning.progress', {
                  completed: checklist.items.filter((item) => item.completed).length,
                  total: checklist.items.length,
                })}
              </Text>
            </div>
            {canEdit && (
              <Flex className={styles.addItem} gap={8}>
                <Input
                  aria-label={t('projects.planning.itemText')}
                  placeholder={t('projects.planning.itemPlaceholder')}
                  value={newItemText}
                  onChange={(event) => setNewItemText(event.target.value)}
                  onPressEnter={addItem}
                  disabled={saving}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  aria-label={t('projects.planning.addItem')}
                  disabled={!newItemText.trim()}
                  loading={saving}
                  onClick={addItem}
                >
                  {t('projects.planning.addItem')}
                </Button>
              </Flex>
            )}
          </Flex>

          {checklist.items.length === 0 ? (
            <EmptyHint icon={<CheckSquareOutlined />} title={t('projects.planning.empty')} />
          ) : (
            <ol className={styles.items} aria-label={checklist.name}>
              {checklist.items.map((item, index) => (
                <li key={item.id} className={styles.item} data-checklist-item>
                  <Checkbox
                    checked={item.completed}
                    disabled={!canEdit || saving}
                    aria-label={t(item.completed ? 'projects.planning.markIncomplete' : 'projects.planning.markCompleted', {
                      item: item.text,
                    })}
                    onChange={(event) => updateItem(item, { completed: event.target.checked })}
                  />
                  {editingItemId === item.id ? (
                    <Input
                      aria-label={t('projects.planning.editItem')}
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      onPressEnter={() => saveEditedItem(item)}
                      disabled={saving}
                      autoFocus
                    />
                  ) : (
                    <Text className={item.completed ? styles.completed : styles.itemText}>
                      {item.text}
                    </Text>
                  )}
                  {canEdit && (
                    <Flex gap={4} className={styles.actions}>
                      {editingItemId === item.id ? (
                        <Button
                          type="primary"
                          size="small"
                          aria-label={t('projects.planning.saveItem')}
                          disabled={!editingText.trim()}
                          loading={saving}
                          onClick={() => saveEditedItem(item)}
                        >
                          {t('projects.planning.saveItem')}
                        </Button>
                      ) : (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          aria-label={t('projects.planning.editItem')}
                          disabled={saving}
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditingText(item.text);
                          }}
                        />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowUpOutlined />}
                        aria-label={t('projects.planning.moveUp')}
                        disabled={saving || index === 0}
                        onClick={() => updateItem(item, { position: index - 1 })}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowDownOutlined />}
                        aria-label={t('projects.planning.moveDown')}
                        disabled={saving || index === checklist.items.length - 1}
                        onClick={() => updateItem(item, { position: index + 1 })}
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={t('projects.planning.deleteItem')}
                        disabled={saving}
                        onClick={() => {
                          void runMutation(
                            () => deleteProjectChecklistItem(project.id, item.id),
                            'projects.planning.deleteError',
                          );
                        }}
                      />
                    </Flex>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Flex>
      )}
    </PageContainer>
  );
}
