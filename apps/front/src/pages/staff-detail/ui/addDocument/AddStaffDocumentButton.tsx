import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useWorkspaceAccess } from '@/entities/workspace-member';

export function AddStaffDocumentButton() {
  const { t } = useTranslation();
  const { canAccess } = useWorkspaceAccess();

  if (!canAccess('staff', 'edit')) {
    return null;
  }

  return (
    <Button type="primary" disabled icon={<PlusOutlined />}>
      {t('staff.documents.comingSoon')}
    </Button>
  );
}
