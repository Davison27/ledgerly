import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Avatar, Flex, Segmented, Skeleton, Typography } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import {
  staffDocumentFileUrl,
  staffDocumentTypeQueries,
  staffQueries,
} from '@/entities/staff-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import { DetailPageHeader } from '@/shared/ui/DetailPageHeader';
import { useStaffDetailSection, type StaffDetailSection } from '../../model/useStaffDetailSection';
import { ProfileSection } from '../profile/ProfileSection';
import { StaffDocumentsSection } from '../documents/StaffDocumentsSection';
import { PayrollsSection } from '../payrolls/PayrollsSection';
import { AgendaSection } from '../agenda/AgendaSection';
import styles from './StaffMemberDetailPage.module.css';

const { Text } = Typography;

const PHOTO_TYPE_CODE = 'foto';

export function StaffMemberDetailPage() {
  const { t } = useTranslation();
  const { staffMemberId } = useParams({ strict: false }) as { staffMemberId?: string };
  const { canAccess } = useWorkspaceAccess();
  const canViewStaff = canAccess('staff', 'view');
  const canViewDocuments = canViewStaff && canAccess('documents', 'view');
  const canViewCalendar =
    canViewStaff && canAccess('calendar', 'view') && canAccess('projects', 'view');
  const allowedSections: StaffDetailSection[] = [
    ...(canViewDocuments ? ['documents' as const, 'payrolls' as const] : []),
    ...(canViewCalendar ? ['schedule' as const] : []),
  ];
  if (allowedSections.length === 0 && canViewStaff) allowedSections.push('profile');
  const { section, setSection } = useStaffDetailSection(staffMemberId, allowedSections);

  const {
    data: staffMember,
    isPending: loading,
    isError: loadError,
  } = useQuery({
    ...staffQueries.detail(staffMemberId ?? ''),
    enabled: Boolean(staffMemberId) && canViewStaff,
  });

  const { data: documentTypes = [] } = useQuery({
    ...staffDocumentTypeQueries.list(),
    enabled: canViewDocuments,
  });

  const photoTypeId = useMemo(
    () => documentTypes.find((type) => type.code === PHOTO_TYPE_CODE)?.id,
    [documentTypes],
  );

  const { data: photoDocuments = [] } = useQuery({
    ...staffQueries.documents(staffMemberId ?? '', photoTypeId),
    enabled: canViewDocuments && Boolean(staffMemberId) && Boolean(photoTypeId),
  });

  const latestPhoto = useMemo(() => {
    if (photoDocuments.length === 0) return null;
    return [...photoDocuments].sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
  }, [photoDocuments]);

  if (!canViewStaff) return null;

  if (loading) {
    return (
      <PageContainer>
        <Skeleton active avatar paragraph={{ rows: 6 }} />
      </PageContainer>
    );
  }

  if (loadError || !staffMember) {
    return (
      <PageContainer>
        <Text type="secondary">{t('staff.detail.notFound')}</Text>
      </PageContainer>
    );
  }

  const labels: Record<StaffDetailSection, string> = {
    documents: t('staff.sections.documents'),
    payrolls: t('staff.sections.payrolls'),
    schedule: t('staff.sections.schedule'),
    profile: t('staff.sections.profile'),
  };
  const options = allowedSections.map((value) => ({ label: labels[value], value }));

  const avatarSrc =
    latestPhoto && staffMemberId ? staffDocumentFileUrl(staffMemberId, latestPhoto.id) : undefined;

  const avatar = avatarSrc ? (
    <Avatar size={28} src={avatarSrc} />
  ) : (
    <Avatar size={28} className={styles.avatarFallback} icon={<IdcardOutlined />} />
  );

  return (
    <Flex vertical className={styles.page}>
      <DetailPageHeader
        backTo="/staff"
        backLabel={t('staff.detail.back')}
        avatar={avatar}
        title={`${staffMember.firstName} ${staffMember.lastName}`}
        subtitle={staffMember.position}
        sections={
          <Segmented<StaffDetailSection> value={section} onChange={setSection} options={options} />
        }
      />

      <div className={styles.content}>
        <div className={styles.layout}>
          <main className={styles.workspace}>
            {section === 'profile' && <ProfileSection staffMember={staffMember} />}
            {section === 'documents' && <StaffDocumentsSection staffMember={staffMember} />}
            {section === 'payrolls' && <PayrollsSection staffMember={staffMember} />}
            {section === 'schedule' && <AgendaSection staffMember={staffMember} />}
          </main>
          {section !== 'profile' && (
            <aside className={styles.profileAside}>
              <ProfileSection staffMember={staffMember} />
            </aside>
          )}
        </div>
      </div>
    </Flex>
  );
}
