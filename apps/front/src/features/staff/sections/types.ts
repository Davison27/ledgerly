import type { StaffMemberDto } from '../../../data/api/types';

export interface StaffSectionProps {
  staffMember: StaffMemberDto;
  /** Reloads the staff member itself (profile edits, going on/off leave...). */
  onStaffMemberUpdated: () => void;
  /** Reloads whatever this section may affect on the header (the avatar photo). */
  onDocumentsChanged: () => void;
}
