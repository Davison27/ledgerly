import { useEffect, useState } from 'react';
import { App, Form, Modal, Select, Switch } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { parentClientError } from '@/entities/client';
import type { Project, ProjectFormValues } from '@/entities/project';
import { projectChecklistQueries } from '@/entities/project-checklist';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import {
  parentClientErrorMessageKey,
  ProjectFormFields,
  refreshParentClientCaches,
  type ProjectFormFieldValues,
} from '@/features/project-form';
import styles from './ProjectFormModal.module.css';

interface ProjectFormModalProps {
  open: boolean;
  project?: Project | null;
  scopedClientId?: string;
  scopedClientName?: string;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
}

export function ProjectFormModal({
  open,
  project,
  scopedClientId,
  scopedClientName,
  onCancel,
  onSubmit,
}: ProjectFormModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [planningEnabled, setPlanningEnabled] = useState(false);
  const isEdit = Boolean(project);
  const { canAccess } = useWorkspaceAccess();
  const canConfigurePlanning = !isEdit && canAccess('projects', 'edit') && canAccess('planning', 'edit');
  const canViewPlanning = canAccess('planning', 'view');
  const {
    data: templates = [],
    isPending: templatesPending,
    isError: templatesError,
  } = useQuery({
    ...projectChecklistQueries.templates(),
    enabled: open && canConfigurePlanning && canViewPlanning,
  });

  useEffect(() => {
    if (!open) return;
    setPlanningEnabled(false);

    if (project) {
      form.setFieldsValue({
        name: project.name,
        code: project.code,
        type: project.type ?? 'other',
        status: project.status ?? 'active',
        description: project.description,
        clientId: project.clientId ?? '',
        address: project.address,
        startDate: project.startDate ? dayjs(project.startDate) : undefined,
        endDate: project.endDate ? dayjs(project.endDate) : undefined,
        budget: project.budget,
        currency: project.currency,
        manager: project.manager,
      });
      setImage(project.image);
    } else {
      form.resetFields();
      if (scopedClientId) {
        form.setFieldValue('clientId', scopedClientId);
      }
      setImage(undefined);
    }
  }, [open, project, scopedClientId, form]);

  const handleCancel = () => {
    form.resetFields();
    setImage(undefined);
    setPlanningEnabled(false);
    onCancel();
  };

  const handleParentClientError = async (error: unknown): Promise<boolean> => {
    const mappedError = parentClientError(error);
    if (!mappedError) return false;

    if (mappedError === 'required') {
      form.setFields([{
        name: 'clientId',
        errors: [t(parentClientErrorMessageKey(mappedError))],
      }]);
      return true;
    }

    await refreshParentClientCaches(queryClient);
    void message.error(t(parentClientErrorMessageKey(mappedError)));
    return true;
  };

  const handleOk = async () => {
    let values: ProjectFormFieldValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const { startDate, endDate, ...rest } = values;
    const payload = {
      ...rest,
      clientId: isEdit && project && values.clientId === project.clientId
        ? undefined
        : values.clientId,
      startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
      endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
      image,
      ...(!isEdit && planningEnabled ? { checklistTemplateId: values.checklistTemplateId } : {}),
    } as ProjectFormValues;

    try {
      await onSubmit(payload);
      form.resetFields();
      setImage(undefined);
      setPlanningEnabled(false);
    } catch (error) {
      if (await handleParentClientError(error)) return;
      void message.error(t(isEdit ? 'projects.form.updateError' : 'projects.form.createError'));
    }
  };

  return (
    <Modal
      open={open}
      title={t(isEdit ? 'projects.form.editTitle' : 'projects.form.title')}
      okText={t(isEdit ? 'projects.form.save' : 'projects.form.submit')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnHidden
      centered
      width="min(1080px, 95vw)"
      classNames={{ body: styles.body }}
    >
      <Form<ProjectFormFieldValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ status: 'active', currency: 'EUR' }}
      >
        <ProjectFormFields
          image={image}
          onImageChange={setImage}
          colorSeed={project?.id}
          currentClient={project?.client ?? null}
          lockedClientId={!project ? scopedClientId : undefined}
          lockedClientName={!project ? scopedClientName : undefined}
        />
        {canConfigurePlanning && (
          <>
            <Form.Item label={t('projects.planning.enable')}>
              <Switch
                aria-label={t('projects.planning.enable')}
                checked={planningEnabled}
                onChange={(enabled) => {
                  setPlanningEnabled(enabled);
                  if (!enabled) form.setFieldValue('checklistTemplateId', undefined);
                }}
              />
            </Form.Item>
            {planningEnabled && (
              <Form.Item
                name="checklistTemplateId"
                label={t('projects.planning.template')}
                rules={[{ required: true, message: t('projects.planning.templateRequired') }]}
                help={templatesError ? t('projects.planning.templatesLoadError') : undefined}
              >
                <Select
                  aria-label={t('projects.planning.template')}
                  loading={templatesPending}
                  optionFilterProp="label"
                  options={templates.map((template) => ({ value: template.id, label: template.name }))}
                />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
