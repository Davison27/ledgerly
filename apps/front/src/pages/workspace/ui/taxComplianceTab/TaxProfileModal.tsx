import { useEffect, useMemo, useState } from 'react';
import { App, Checkbox, Form, Input, Modal, Select, Skeleton, Switch, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  saveTaxClientProfile,
  type SaveTaxClientProfilePayload,
  type TaxClientProfileDto,
  type TaxObligationDto,
} from '@/entities/tax-compliance';
import { ApiError } from '@/shared/api/httpClient';
import type { Project } from '@/entities/project';

const { Text } = Typography;

interface TaxProfileFormValues {
  entityType: SaveTaxClientProfilePayload['entityType'];
  regionCode?: string;
  enabled: boolean;
  obligationKeys: string[];
}

export interface TaxProfileModalProps {
  open: boolean;
  project: Project | null;
  profile: TaxClientProfileDto | null;
  obligations: TaxObligationDto[];
  loading: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function TaxProfileModal({
  open,
  project,
  profile,
  obligations,
  loading,
  onClose,
  onSaved,
}: TaxProfileModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<TaxProfileFormValues>();
  const [saving, setSaving] = useState(false);
  const enabled = Form.useWatch('enabled', form) ?? true;

  const obligationOptions = useMemo(
    () =>
      obligations.map((obligation) => ({
        label: (
          <span>
            <Text strong>{obligation.name}</Text>
            <Text type="secondary"> · {obligation.description}</Text>
          </span>
        ),
        value: obligation.key,
      })),
    [obligations],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      entityType: profile?.entityType ?? 'autonomo',
      regionCode: profile?.regionCode ?? undefined,
      enabled: profile?.enabled ?? true,
      obligationKeys: profile?.obligationKeys ?? [],
    });
  }, [form, open, profile]);

  const handleSave = async () => {
    if (!project) return;

    try {
      const values = await form.validateFields();
      setSaving(true);
      await saveTaxClientProfile(project.id, {
        countryCode: 'ES',
        entityType: values.entityType,
        regionCode: values.regionCode?.trim() || null,
        enabled: values.enabled,
        obligationKeys: values.obligationKeys,
      });
      await onSaved();
      void message.success(t('workspace.taxCompliance.profile.saved'));
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        void message.error(error.message || t('workspace.taxCompliance.profile.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('workspace.taxCompliance.profile.title', { name: project?.name ?? '' })}
      onCancel={onClose}
      onOk={() => void handleSave()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      destroyOnHidden
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label={t('workspace.taxCompliance.profile.country')}>
            <Select
              disabled
              value="ES"
              options={[{ value: 'ES', label: t('workspace.taxCompliance.profile.spain') }]}
            />
          </Form.Item>

          <Form.Item
            name="entityType"
            label={t('workspace.taxCompliance.profile.entityType')}
            rules={[
              { required: true, message: t('workspace.taxCompliance.profile.entityTypeRequired') },
            ]}
          >
            <Select
              options={[
                { value: 'autonomo', label: t('workspace.taxCompliance.entityTypes.autonomo') },
                { value: 'sociedad', label: t('workspace.taxCompliance.entityTypes.sociedad') },
                { value: 'particular', label: t('workspace.taxCompliance.entityTypes.particular') },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="regionCode"
            label={t('workspace.taxCompliance.profile.region')}
            extra={t('workspace.taxCompliance.profile.regionHint')}
          >
            <Input placeholder={t('workspace.taxCompliance.profile.regionPlaceholder')} />
          </Form.Item>

          <Form.Item
            name="enabled"
            label={t('workspace.taxCompliance.profile.enabled')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="obligationKeys"
            label={t('workspace.taxCompliance.profile.obligations')}
            rules={[
              {
                validator: async (_, value: string[]) => {
                  if (!enabled || value?.length > 0) return;
                  throw new Error(t('workspace.taxCompliance.profile.obligationRequired'));
                },
              },
            ]}
          >
            <Checkbox.Group options={obligationOptions} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
