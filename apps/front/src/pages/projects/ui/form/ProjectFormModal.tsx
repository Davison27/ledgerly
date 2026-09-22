import { useEffect, useState } from 'react';
import { App, Form, Modal } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { parentClientError } from '@/entities/client';
import type { Project, ProjectFormValues } from '@/entities/project';
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
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
}

export function ProjectFormModal({ open, project, onCancel, onSubmit }: ProjectFormModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const isEdit = Boolean(project);

  useEffect(() => {
    if (!open) return;

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
      setImage(undefined);
    }
  }, [open, project, form]);

  const handleCancel = () => {
    form.resetFields();
    setImage(undefined);
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
    } as ProjectFormValues;

    try {
      await onSubmit(payload);
      form.resetFields();
      setImage(undefined);
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
        />
      </Form>
    </Modal>
  );
}
