import { useTranslation } from 'react-i18next';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import type { WorkspaceRoleDto } from '../../api/types';
import { ROLE_TONE } from '../../model/memberView';

export interface RoleTagProps {
  role: WorkspaceRoleDto;
}

export function RoleTag({ role }: RoleTagProps) {
  const { t } = useTranslation();
  return <SemanticTag tone={ROLE_TONE[role]}>{t(`workspace.roles.${role}.name`)}</SemanticTag>;
}
