import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Avatar, Flex, Segmented, Spin, Typography, theme } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  getStaffMember,
  listStaffDocumentTypes,
  listStaffDocuments,
  staffDocumentFileUrl,
  type StaffDocumentDto,
  type StaffDocumentTypeDto,
  type StaffMemberDto,
} from '@/entities/staff-member';
import { LAYOUT, SPACE } from '@/shared/config/theme';
import { PageContainer } from '@/shared/ui/PageContainer';
import { ProfileSection } from './ProfileSection';
import { StaffDocumentsSection } from './StaffDocumentsSection';
import { PayrollsSection } from './PayrollsSection';

const { Text } = Typography;
const { useToken } = theme;

type Section = 'profile' | 'documents' | 'payrolls';

const PHOTO_TYPE_CODE = 'foto';

export function StaffMemberDetailPage() {
  const { token } = useToken();
  const { t } = useTranslation();
  const { staffMemberId } = useParams({ strict: false }) as { staffMemberId?: string };

  const [staffMember, setStaffMember] = useState<StaffMemberDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [section, setSection] = useState<Section>('profile');

  const [documentTypes, setDocumentTypes] = useState<StaffDocumentTypeDto[]>([]);
  const [photoDocuments, setPhotoDocuments] = useState<StaffDocumentDto[]>([]);
  const [documentsVersion, setDocumentsVersion] = useState(0);

  const loadStaffMember = useCallback(() => {
    if (!staffMemberId) return;
    setLoading(true);
    setLoadError(false);
    getStaffMember(staffMemberId)
      .then(setStaffMember)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [staffMemberId]);

  useEffect(() => {
    loadStaffMember();
  }, [loadStaffMember]);

  useEffect(() => {
    listStaffDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => setDocumentTypes([]));
  }, []);

  const photoTypeId = useMemo(
    () => documentTypes.find((type) => type.code === PHOTO_TYPE_CODE)?.id,
    [documentTypes],
  );

  useEffect(() => {
    if (!staffMemberId || !photoTypeId) {
      setPhotoDocuments([]);
      return;
    }
    listStaffDocuments(staffMemberId, photoTypeId)
      .then(setPhotoDocuments)
      .catch(() => setPhotoDocuments([]));
  }, [staffMemberId, photoTypeId, documentsVersion]);

  const latestPhoto = useMemo(() => {
    if (photoDocuments.length === 0) return null;
    return [...photoDocuments].sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
  }, [photoDocuments]);

  const handleDocumentsChanged = () => setDocumentsVersion((v) => v + 1);

  if (loading) {
    return (
      <PageContainer>
        <Flex justify="center" style={{ padding: '48px 0' }}>
          <Spin />
        </Flex>
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
        {section === 'profile' && (
          <ProfileSection
            staffMember={staffMember}
            onStaffMemberUpdated={loadStaffMember}
            onDocumentsChanged={handleDocumentsChanged}
          />
        )}
        {section === 'documents' && (
          <StaffDocumentsSection
            staffMember={staffMember}
            onStaffMemberUpdated={loadStaffMember}
            onDocumentsChanged={handleDocumentsChanged}
          />
        )}
        {section === 'payrolls' && (
          <PayrollsSection
            staffMember={staffMember}
            onStaffMemberUpdated={loadStaffMember}
            onDocumentsChanged={handleDocumentsChanged}
          />
        )}
      </div>
    </Flex>
  );
}
