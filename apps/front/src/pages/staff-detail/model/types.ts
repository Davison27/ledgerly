import type { StaffMemberDto } from '@/entities/staff-member';

export interface StaffSectionProps {
  staffMember: StaffMemberDto;
  onStaffMemberUpdated: () => void;
  onDocumentsChanged: () => void;
}
