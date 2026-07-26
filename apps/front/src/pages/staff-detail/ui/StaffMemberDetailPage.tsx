import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Avatar, Flex, Segmented, Skeleton, Typography, theme } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  staffDocumentFileUrl,
  staffDocumentTypeQueries,
  staffQueries,
} from '@/entities/staff-member';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { PageContainer } from '@/shared/ui/PageContainer';
import { ProfileSection } from './ProfileSection';
import { StaffDocumentsSection } from './StaffDocumentsSection';
import { PayrollsSection } from './PayrollsSection';
import { AgendaSection } from './AgendaSection';

const { Text } = Typography;
const { useToken } = theme;

type Section = 'profile' | 'documents' | 'payrolls' | 'schedule';

const PHOTO_TYPE_CODE = 'foto';

export function StaffMemberDetailPage() {
  const { token } = useToken();
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
    <Flex vertical style={{ flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.xxl,
          flex: 'none',
          height: LAYOUT.sectionHeaderHeight,
          padding: `0 ${LAYOUT.pagePaddingInline}px`,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Flex align="center" gap={10}>
          {avatarSrc ? (
            <Avatar size={28} src={avatarSrc} />
          ) : (
            <Avatar size={28} style={{ backgroundColor: token.colorPrimary }} icon={<IdcardOutlined />} />
          )}
          <Flex align="baseline" gap={8}>
            <Text strong style={{ fontSize: 16 }}>
              {staffMember.firstName} {staffMember.lastName}
            </Text>
            {staffMember.position && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {staffMember.position}
              </Text>
            )}
          </Flex>
        </Flex>
        <Segmented<Section> value={section} onChange={setSection} options={options} />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {section === 'profile' && <ProfileSection staffMember={staffMember} />}
        {section === 'documents' && <StaffDocumentsSection staffMember={staffMember} />}
        {section === 'payrolls' && <PayrollsSection staffMember={staffMember} />}
        {section === 'schedule' && <AgendaSection staffMember={staffMember} />}
      </div>
    </Flex>
  );
}
