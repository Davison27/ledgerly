import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Avatar, Flex, Segmented, Skeleton, Typography } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  staffDocumentFileUrl,
  staffDocumentTypeQueries,
  staffQueries,
} from '@/entities/staff-member';
import { PageContainer } from '@/shared/ui/PageContainer';
import typography from '@/shared/ui/typography.module.css';
import { ProfileSection } from '../profile/ProfileSection';
import { StaffDocumentsSection } from '../documents/StaffDocumentsSection';
import { PayrollsSection } from '../payrolls/PayrollsSection';
import { AgendaSection } from '../agenda/AgendaSection';
import styles from './StaffMemberDetailPage.module.css';

const { Text } = Typography;

type Section = 'profile' | 'documents' | 'payrolls' | 'schedule';

const PHOTO_TYPE_CODE = 'foto';

export function StaffMemberDetailPage() {
  const { t } = useTranslation();
  const { staffMemberId } = useParams({ strict: false }) as { staffMemberId?: string };
  const [section, setSection] = useState<Section>('profile');

  const {
    data: staffMember,
    isPending: loading,
    isError: loadError,
  } = useQuery({
    ...staffQueries.detail(staffMemberId ?? ''),
    enabled: Boolean(staffMemberId),
  });

  const { data: documentTypes = [] } = useQuery(staffDocumentTypeQueries.list());

  const photoTypeId = useMemo(
    () => documentTypes.find((type) => type.code === PHOTO_TYPE_CODE)?.id,
    [documentTypes],
  );

  const { data: photoDocuments = [] } = useQuery({
    ...staffQueries.documents(staffMemberId ?? '', photoTypeId),
    enabled: Boolean(staffMemberId) && Boolean(photoTypeId),
  });

  const latestPhoto = useMemo(() => {
    if (photoDocuments.length === 0) return null;
    return [...photoDocuments].sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
  }, [photoDocuments]);

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

  const options = [
    { label: t('staff.sections.profile'), value: 'profile' as const },
    { label: t('staff.sections.documents'), value: 'documents' as const },
    { label: t('staff.sections.payrolls'), value: 'payrolls' as const },
    { label: t('staff.sections.schedule'), value: 'schedule' as const },
  ];

  const avatarSrc =
    latestPhoto && staffMemberId ? staffDocumentFileUrl(staffMemberId, latestPhoto.id) : undefined;

  return (
    <Flex vertical className={styles.page}>
      <div className={styles.header}>
        <Flex align="center" gap={10}>
          {avatarSrc ? (
            <Avatar size={28} src={avatarSrc} />
          ) : (
            <Avatar size={28} className={styles.avatarFallback} icon={<IdcardOutlined />} />
          )}
          <Flex align="baseline" gap={8}>
            <Text strong className={styles.staffName}>
              {staffMember.firstName} {staffMember.lastName}
            </Text>
            {staffMember.position && (
              <Text type="secondary" className={typography.caption}>
                {staffMember.position}
              </Text>
            )}
          </Flex>
        </Flex>
        <Segmented<Section> value={section} onChange={setSection} options={options} />
      </div>

      <div className={styles.content}>
        {section === 'profile' && <ProfileSection staffMember={staffMember} />}
        {section === 'documents' && <StaffDocumentsSection staffMember={staffMember} />}
        {section === 'payrolls' && <PayrollsSection staffMember={staffMember} />}
        {section === 'schedule' && <AgendaSection staffMember={staffMember} />}
      </div>
    </Flex>
  );
}
