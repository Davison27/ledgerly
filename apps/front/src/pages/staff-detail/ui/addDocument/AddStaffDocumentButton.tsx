import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Dropdown, type MenuProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { staffDocumentTypeQueries } from '@/entities/staff-member';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { DocumentUploadModal } from '@/features/upload-document';
import { StaffDocumentUploadModal } from '../upload/StaffDocumentUploadModal';

interface AddStaffDocumentButtonProps {
  staffMemberId: string;
  mode?: 'document' | 'payroll' | 'all';
}

const PAYROLL_MENU_KEY = 'payroll';

export function AddStaffDocumentButton({
  staffMemberId,
  mode = 'all',
}: AddStaffDocumentButtonProps) {
  const { t } = useTranslation();
  const { data: documentTypes = [] } = useQuery(staffDocumentTypeQueries.list());
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const { canAccess } = useWorkspaceAccess();
  const canEdit = canAccess('staff', 'edit');

  const items: MenuProps['items'] = [
    ...(mode === 'payroll' ? [] : documentTypes.filter((type) => type.code !== 'nomina').map((type) => ({
      key: type.id,
      label: t(`staff.documentTypes.${type.code}`, { defaultValue: type.name }),
    }))),
    ...(mode === 'all' ? [{ type: 'divider' as const }] : []),
    ...(mode === 'document' ? [] : [{ key: PAYROLL_MENU_KEY, label: t('staff.payrolls.title') }]),
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === PAYROLL_MENU_KEY) {
      setPayrollModalOpen(true);
    } else {
      setSelectedTypeId(key);
    }
  };

  if (!canEdit) {
    return null;
  }

  if (mode === 'document') {
    return (
      <>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDocumentModalOpen(true)}>
          {t('staff.documents.add')}
        </Button>
        <StaffDocumentUploadModal
          open={documentModalOpen}
          staffMemberId={staffMemberId}
          documentTypes={documentTypes}
          onCancel={() => setDocumentModalOpen(false)}
          onCreated={() => setDocumentModalOpen(false)}
        />
      </>
    );
  }

  if (mode === 'payroll') {
    return (
      <>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPayrollModalOpen(true)}>
          {t('staff.payrolls.add')}
        </Button>
        <DocumentUploadModal
          open={payrollModalOpen}
          context={{ kind: 'staffPayroll', staffMemberId }}
          onCancel={() => setPayrollModalOpen(false)}
          onCreated={() => setPayrollModalOpen(false)}
        />
      </>
    );
  }

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
