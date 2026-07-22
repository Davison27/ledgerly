import type { StaffMemberDto } from '../../../data/api/types';

export interface StaffSectionProps {
  staffMember: StaffMemberDto;
  onStaffMemberUpdated: () => void;
  onDocumentsChanged: () => void;
}
