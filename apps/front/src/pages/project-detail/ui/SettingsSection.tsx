import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Flex, Form, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ProjectSectionProps } from '../model/types';
import { projectQueries, updateProject, type ProjectFormValues } from '@/entities/project';
import { ApiError } from '@/shared/api/httpClient';
import { PageContainer } from '@/shared/ui/PageContainer';
import {
  ProjectFormFields,
  type ProjectFormFieldValues,
} from '@/features/project-form';

const { Title } = Typography;

export function SettingsSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [image, setImage] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const { data: fullProject, isPending: loading, isError } = useQuery(
    projectQueries.detail(project.id),
  );

  useEffect(() => {
    if (isError) {
      void message.error(t('projects.settings.loadError'));
    }
  }, [isError, message, t]);

  useEffect(() => {
    if (!fullProject) return;
    setImage(fullProject.image);
    form.setFieldsValue({
      name: fullProject.name,
      code: fullProject.code,
      type: fullProject.type ?? 'other',
      status: fullProject.status ?? 'active',
      description: fullProject.description,
      clientCompany: fullProject.clientCompany,
      clientTaxId: fullProject.clientTaxId,
      contactName: fullProject.contactName,
      contactEmail: fullProject.contactEmail,
      contactPhone: fullProject.contactPhone,
      address: fullProject.address,
      startDate: fullProject.startDate ? dayjs(fullProject.startDate) : undefined,
      endDate: fullProject.endDate ? dayjs(fullProject.endDate) : undefined,
      budget: fullProject.budget,
      currency: fullProject.currency,
      fiscalYear: fullProject.fiscalYear,
      manager: fullProject.manager,
    });
  }, [fullProject, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then(async (values) => {
        const { startDate, endDate, ...rest } = values;
        const payload: ProjectFormValues = {
          ...rest,
          startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
          endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
          image,
        };
        setSaving(true);
        try {
          await updateProject(project.id, payload);
          await queryClient.invalidateQueries({ queryKey: projectQueries.all });
          void message.success(t('projects.settings.saved'));
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            void message.error(t('projects.form.duplicateCode'));
          } else {
            void message.error(t('projects.settings.saveError'));
          }
        } finally {
          setSaving(false);
        }
      })
      .catch(() => {});
  };

  if (loading || !fullProject) {
    return (
      <PageContainer maxWidth={1080}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1080}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0 }}>
          {t('projects.settings.details')}
        </Title>
        <Button type="primary" loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Flex>
      <Form<ProjectFormFieldValues> form={form} layout="vertical" requiredMark={false}>
        <ProjectFormFields image={image} onImageChange={setImage} colorSeed={fullProject.id} />
      </Form>
    </PageContainer>
  );
}
