import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { staffDocumentTypeQueries } from '@/entities/staff-member';
import { DocumentUploadModal } from '@/features/upload-document';
import { StaffDocumentUploadModal } from '../upload/StaffDocumentUploadModal';

interface AddStaffDocumentButtonProps {
  staffMemberId: string;
}

const PAYROLL_MENU_KEY = 'payroll';

export function AddStaffDocumentButton({ staffMemberId }: AddStaffDocumentButtonProps) {
  const { t } = useTranslation();
  const { data: documentTypes = [] } = useQuery(staffDocumentTypeQueries.list());
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);

  const items: MenuProps['items'] = [
    ...documentTypes.map((type) => ({
      key: type.id,
      label: t(`staff.documentTypes.${type.code}`, { defaultValue: type.name }),
    })),
    { type: 'divider' as const },
    { key: PAYROLL_MENU_KEY, label: t('staff.payrolls.title') },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === PAYROLL_MENU_KEY) {
      setPayrollModalOpen(true);
    } else {
      setSelectedTypeId(key);
    }
  };

  return (
    <>
      <Dropdown menu={{ items, onClick: handleClick }} trigger={['click']}>
        <Button type="primary" icon={<PlusOutlined />}>
          {t('staff.detail.add')}
        </Button>
      </Dropdown>

      <StaffDocumentUploadModal
        open={selectedTypeId !== null}
        staffMemberId={staffMemberId}
        documentTypes={documentTypes}
        initialTypeId={selectedTypeId ?? undefined}
        onCancel={() => setSelectedTypeId(null)}
        onCreated={() => setSelectedTypeId(null)}
      />

      <DocumentUploadModal
        open={payrollModalOpen}
        context={{ kind: 'staffPayroll', staffMemberId }}
        onCancel={() => setPayrollModalOpen(false)}
        onCreated={() => setPayrollModalOpen(false)}
      />
    </>
  );
}
