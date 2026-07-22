import { useState } from 'react';
import { Button, Dropdown, type MenuProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { StaffDocumentTypeDto } from '@/entities/staff-member';
import { DocumentUploadModal } from '../../projects/sections/documents/DocumentUploadModal';
import { StaffDocumentUploadModal } from './StaffDocumentUploadModal';

interface AddStaffDocumentButtonProps {
  staffMemberId: string;
  documentTypes: StaffDocumentTypeDto[];
  onCreated: () => void;
}

const PAYROLL_MENU_KEY = 'payroll';

export function AddStaffDocumentButton({
  staffMemberId,
  documentTypes,
  onCreated,
}: AddStaffDocumentButtonProps) {
  const { t } = useTranslation();
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
        onCreated={() => {
          setSelectedTypeId(null);
          onCreated();
        }}
      />

      <DocumentUploadModal
        open={payrollModalOpen}
        context={{ kind: 'staffPayroll', staffMemberId }}
        onCancel={() => setPayrollModalOpen(false)}
        onCreated={() => {
          setPayrollModalOpen(false);
          onCreated();
        }}
      />
    </>
  );
}
