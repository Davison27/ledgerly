import { useState } from 'react';
import { App, Button, Descriptions, Flex } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { updateStaffMember } from '../../../data/api/staff.api';
import { PageContainer } from '../../../components/ui/PageContainer';
import { Numeric } from '../../../components/ui/Numeric';
import { SemanticTag } from '../../../components/ui/SemanticTag';
import {
  StaffMemberFormModal,
  type StaffMemberFormValues,
} from '../components/StaffMemberFormModal';
import type { StaffSectionProps } from './types';

export function ProfileSection({ staffMember, onStaffMemberUpdated }: StaffSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: StaffMemberFormValues) => {
    setSubmitting(true);
    try {
      await updateStaffMember(staffMember.id, values);
      void message.success(t('staff.form.updated'));
      setIsFormOpen(false);
      onStaffMemberUpdated();
    } catch {
      void message.error(t('staff.form.updateError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer maxWidth={1080}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 20 }}>
        <Flex align="center" gap={8}>
          {staffMember.endDate && (
            <SemanticTag tone="neutral">{t('staff.columns.inactive')}</SemanticTag>
          )}
        </Flex>
        <Button type="primary" icon={<EditOutlined />} onClick={() => setIsFormOpen(true)}>
          {t('common.edit')}
        </Button>
      </Flex>

      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label={t('staff.fields.firstName')}>
          {staffMember.firstName}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.lastName')}>
          {staffMember.lastName}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.taxId')}>
          {staffMember.taxId || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.position')}>
          {staffMember.position || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.email')}>
          {staffMember.email || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.phone')}>
          {staffMember.phone || '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.hireDate')}>
          {staffMember.hireDate ? <Numeric>{staffMember.hireDate}</Numeric> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.endDate')}>
          {staffMember.endDate ? <Numeric>{staffMember.endDate}</Numeric> : '—'}
        </Descriptions.Item>
        <Descriptions.Item label={t('staff.fields.notes')} span={2}>
          {staffMember.notes || '—'}
        </Descriptions.Item>
      </Descriptions>

      <StaffMemberFormModal
        open={isFormOpen}
        staffMember={staffMember}
        onCancel={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </PageContainer>
  );
}
