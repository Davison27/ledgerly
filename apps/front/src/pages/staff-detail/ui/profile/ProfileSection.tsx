import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Flex, Typography } from 'antd';
import { CalendarOutlined, EditOutlined, IdcardOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { staffQueries, updateStaffMember } from '@/entities/staff-member';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { SPACE } from '@/shared/config/theme';
import { Numeric } from '@/shared/ui/Numeric';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import {
  StaffMemberFormModal,
  type StaffMemberFormValues,
} from '@/features/staff-member-form';
import type { StaffSectionProps } from '../../model/types';
import styles from './ProfileSection.module.css';

const { Text } = Typography;

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
    <>
      <Card
        className={styles.card}
        title={t('staff.sections.profile')}
        extra={
          canEdit ? <Button type="text" icon={<EditOutlined />} onClick={() => setIsFormOpen(true)}>{t('common.edit')}</Button> : undefined
        }
      >
        <Flex vertical gap={16}>
          {staffMember.endDate && (
            <SemanticTag tone="neutral">{t('staff.columns.inactive')}</SemanticTag>
          )}
          <ProfileField icon={<IdcardOutlined />} label={t('staff.fields.position')} value={staffMember.position} />
          <ProfileField icon={<IdcardOutlined />} label={t('staff.fields.taxId')} value={staffMember.taxId} />
          <ProfileField icon={<MailOutlined />} label={t('staff.fields.email')} value={staffMember.email} />
          <ProfileField icon={<PhoneOutlined />} label={t('staff.fields.phone')} value={staffMember.phone} />
          <ProfileField
            icon={<CalendarOutlined />}
            label={t('staff.fields.hireDate')}
            value={staffMember.hireDate ? <Numeric>{staffMember.hireDate}</Numeric> : null}
          />
          {staffMember.endDate && (
            <ProfileField icon={<CalendarOutlined />} label={t('staff.fields.endDate')} value={<Numeric>{staffMember.endDate}</Numeric>} />
          )}
          {staffMember.notes && (
            <div className={styles.notes}>
              <Text type="secondary">{t('staff.fields.notes')}</Text>
              <Text>{staffMember.notes}</Text>
            </div>
          )}
        </Flex>
      </Card>

      <StaffMemberFormModal
        open={isFormOpen}
        staffMember={staffMember}
        onCancel={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </>
  );
}

function ProfileField({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode | null }) {
  return (
    <Flex gap={SPACE.md} className={styles.field}>
      <span className={styles.icon}>{icon}</span>
      <Flex vertical gap={1}>
        <Text type="secondary" className={styles.label}>{label}</Text>
        <Text>{value || '—'}</Text>
      </Flex>
    </Flex>
  );
}
