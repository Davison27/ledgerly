import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Divider, Flex, Form, Select, Skeleton, Switch, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ProjectSectionProps } from '../../model/types';
import { clientQueries, parentClientError } from '@/entities/client';
import { documentQueries } from '@/entities/document';
import {
  projectQueries,
  updateProject,
  updateProjectPlanning,
  type ProjectFormValues,
} from '@/entities/project';
import { projectChecklistQueries } from '@/entities/project-checklist';
import { ApiError } from '@/shared/api/httpClient';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import {
  parentClientErrorMessageKey,
  ProjectFormFields,
  refreshParentClientCaches,
  type ProjectFormFieldValues,
} from '@/features/project-form';
import styles from './SettingsSection.module.css';

const { Title } = Typography;

export function SettingsSection({ project }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProjectFormFieldValues>();
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [planningSaving, setPlanningSaving] = useState(false);
  const [firstActivationRequested, setFirstActivationRequested] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('projects', 'edit');
  const canViewPlanning = canAccess('planning', 'view');
  const canEditPlanning = canEdit && canAccess('planning', 'edit');

  const { data: fullProject, isPending: loading, isError } = useQuery(
    projectQueries.detail(project.id),
  );
  const {
    isError: checklistError,
  } = useQuery({
    ...projectChecklistQueries.project(project.id),
    enabled: canViewPlanning && Boolean(fullProject?.planningEnabled),
    retry: false,
  });
  const checklistAssigned = Boolean(fullProject?.checklistAssigned);
  const {
    data: templates = [],
    isPending: templatesPending,
    isError: templatesError,
  } = useQuery({
    ...projectChecklistQueries.templates(),
    enabled: canEditPlanning && canViewPlanning && firstActivationRequested && !checklistAssigned,
  });

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
      clientId: fullProject.clientId,
      address: fullProject.address,
      startDate: fullProject.startDate ? dayjs(fullProject.startDate) : undefined,
      endDate: fullProject.endDate ? dayjs(fullProject.endDate) : undefined,
      budget: fullProject.budget,
      currency: fullProject.currency,
      manager: fullProject.manager,
    });
  }, [fullProject, form]);

  const handleSave = async () => {
    if (!fullProject) return;

    let values: ProjectFormFieldValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const { startDate, endDate, ...rest } = values;
    const payload = {
      ...rest,
      clientId: values.clientId === fullProject.clientId ? undefined : values.clientId,
      startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
      endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
      image,
    } as ProjectFormValues;
    setSaving(true);
    try {
      await updateProject(project.id, payload);
      const scopedClientIds = [...new Set(
        [fullProject.clientId, values.clientId].filter((id): id is string => Boolean(id)),
      )];
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectQueries.all }),
        queryClient.invalidateQueries({ queryKey: projectQueries.detail(project.id).queryKey }),
        queryClient.invalidateQueries({ queryKey: clientQueries.all }),
        queryClient.invalidateQueries({ queryKey: documentQueries.all }),
        ...scopedClientIds.map((clientId) =>
          queryClient.invalidateQueries({ queryKey: projectQueries.list(clientId).queryKey }),
        ),
      ]);
      void message.success(t('projects.settings.saved'));
    } catch (error) {
      const mappedError = parentClientError(error);
      if (mappedError === 'required') {
        form.setFields([{
          name: 'clientId',
          errors: [t(parentClientErrorMessageKey(mappedError))],
        }]);
      } else if (mappedError) {
        await refreshParentClientCaches(queryClient);
        void message.error(t(parentClientErrorMessageKey(mappedError)));
      } else if (error instanceof ApiError && error.status === 409) {
        void message.error(t('projects.form.duplicateCode'));
      } else {
        void message.error(t('projects.settings.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const refreshPlanningViews = async (planningEnabled: boolean) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: projectQueries.all }),
      queryClient.invalidateQueries({ queryKey: projectQueries.detail(project.id).queryKey }),
    ];
    if (planningEnabled) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: projectChecklistQueries.project(project.id).queryKey }),
      );
    }
    await Promise.all(invalidations);
  };

  const savePlanning = async (planningEnabled: boolean, checklistTemplateId?: string) => {
    setPlanningSaving(true);
    try {
      await updateProjectPlanning(project.id, {
        planningEnabled,
        ...(checklistTemplateId ? { checklistTemplateId } : {}),
      });
      await refreshPlanningViews(planningEnabled);
      setFirstActivationRequested(false);
      setSelectedTemplateId(undefined);
      void message.success(t(planningEnabled ? 'projects.planning.settingsEnabled' : 'projects.planning.settingsDisabled'));
    } catch {
      void message.error(t('projects.planning.settingsSaveError'));
    } finally {
      setPlanningSaving(false);
    }
  };

  const handlePlanningToggle = (enabled: boolean) => {
    if (!canEditPlanning || planningSaving) return;
    if (checklistAssigned) {
      void savePlanning(enabled);
      return;
    }
    setFirstActivationRequested(enabled);
    if (!enabled) setSelectedTemplateId(undefined);
  };

  if (loading || !fullProject) {
    return (
      <PageContainer>
        <Skeleton active paragraph={{ rows: 8 }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Flex align="center" justify="space-between" className={styles.header}>
        <Title level={5} className={styles.title}>
          {t('projects.settings.details')}
        </Title>
        {canEdit && <Button type="primary" loading={saving} onClick={handleSave}>{t('common.save')}</Button>}
      </Flex>
      <Form<ProjectFormFieldValues> form={form} layout="vertical" requiredMark={false} disabled={!canEdit}>
        <ProjectFormFields
          image={image}
          onImageChange={setImage}
          colorSeed={fullProject.id}
          canEdit={canEdit}
          currentClient={fullProject.client ?? null}
        />
      </Form>
      {canViewPlanning && (
        <section aria-labelledby="project-planning-heading">
          <Divider />
          <Title level={5} id="project-planning-heading">{t('projects.planning.title')}</Title>
          {fullProject.planningEnabled && checklistError && (
            <Alert type="error" showIcon title={t('projects.planning.loadError')} />
          )}
          <Flex vertical gap={12}>
            <Flex align="center" justify="space-between">
              <Typography.Text>{t('projects.planning.enable')}</Typography.Text>
              <Switch
                aria-label={t('projects.planning.enable')}
                checked={Boolean(fullProject.planningEnabled) || (!checklistAssigned && firstActivationRequested)}
                disabled={!canEditPlanning || planningSaving}
                loading={planningSaving}
                onChange={handlePlanningToggle}
              />
            </Flex>
            {!checklistAssigned && firstActivationRequested && canEditPlanning && (
              <Flex vertical gap={8}>
                <Select
                  aria-label={t('projects.planning.template')}
                  value={selectedTemplateId}
                  onChange={setSelectedTemplateId}
                  loading={templatesPending}
                  optionFilterProp="label"
                  notFoundContent={t('projects.planning.templatesEmpty')}
                  options={templates.map((template) => ({ value: template.id, label: template.name }))}
                />
                {templatesError && (
                  <Typography.Text type="danger">{t('projects.planning.templatesLoadError')}</Typography.Text>
                )}
                <Button
                  type="primary"
                  loading={planningSaving}
                  disabled={!selectedTemplateId || templatesPending || templatesError}
                  onClick={() => void savePlanning(true, selectedTemplateId)}
                >
                  {t('projects.planning.savePlanning')}
                </Button>
              </Flex>
            )}
          </Flex>
        </section>
      )}
    </PageContainer>
  );
}
