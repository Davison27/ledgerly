import { useTranslation } from 'react-i18next';
import { SemanticTag } from '@/shared/ui/SemanticTag';
import type { WorkspaceMemberStatusDto } from '../../api/types';
import { MEMBER_STATUS_TONE } from '../../model/memberView';

export interface MemberStatusTagProps {
  status: WorkspaceMemberStatusDto;
}

export function MemberStatusTag({ status }: MemberStatusTagProps) {
  const { t } = useTranslation();
  return <SemanticTag tone={MEMBER_STATUS_TONE[status]}>{t(`workspace.members.status.${status}`)}</SemanticTag>;
}
