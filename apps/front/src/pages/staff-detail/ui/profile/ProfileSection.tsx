import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Descriptions, Flex } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { staffQueries, updateStaffMember } from '@/entities/staff-member';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import {
  StaffMemberFormModal,
  type StaffMemberFormValues,
} from '@/features/staff-member-form';
import type { StaffSectionProps } from '../../model/types';
import styles from './ProfileSection.module.css';

export function ProfileSection({ staffMember }: StaffSectionProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('staff', 'edit');

  const handleSubmit = async (values: StaffMemberFormValues) => {
    setSubmitting(true);
    try {
      await updateStaffMember(staffMember.id, values);
      void message.success(t('staff.form.updated'));
      setIsFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: staffQueries.all });
    } catch {
      void message.error(t('staff.form.updateError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer maxWidth={1080}>
      <Flex align="center" justify="space-between" className={styles.header}>
        <Flex align="center" gap={8}>
          {staffMember.endDate && (
            <SemanticTag tone="neutral">{t('staff.columns.inactive')}</SemanticTag>
          )}
        </Flex>
        {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => setIsFormOpen(true)}>{t('common.edit')}</Button>}
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
