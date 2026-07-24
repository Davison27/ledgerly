import { useEffect, useState } from 'react';
import { App, Button, Flex, Form, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ProjectSectionProps } from '../model/types';
import { useCompany } from '@/entities/company';
import { fetchProject, type Project, type ProjectFormValues } from '@/entities/project';
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
  const { updateProject } = useCompany();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [fullProject, setFullProject] = useState<Project | null>(null);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProject(project.id)
      .then((loaded) => {
        if (cancelled) return;
        setFullProject(loaded);
        setImage(loaded.image);
        form.setFieldsValue({
          name: loaded.name,
          code: loaded.code,
          type: loaded.type ?? 'other',
          status: loaded.status ?? 'active',
          description: loaded.description,
          clientCompany: loaded.clientCompany,
          clientTaxId: loaded.clientTaxId,
          contactName: loaded.contactName,
          contactEmail: loaded.contactEmail,
          contactPhone: loaded.contactPhone,
          address: loaded.address,
          startDate: loaded.startDate ? dayjs(loaded.startDate) : undefined,
          endDate: loaded.endDate ? dayjs(loaded.endDate) : undefined,
          budget: loaded.budget,
          currency: loaded.currency,
          fiscalYear: loaded.fiscalYear,
          manager: loaded.manager,
        });
      })
      .catch(() => {
        if (!cancelled) void message.error(t('projects.settings.loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project.id, form, message, t]);

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
