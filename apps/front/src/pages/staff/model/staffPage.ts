import type {
  StaffMemberDeletionOutcome,
  StaffMemberSummaryDto,
} from '@/entities/staff-member';

export function isStaffMemberArchived(staffMember: StaffMemberSummaryDto): boolean {
  return staffMember.archivedAt !== null && staffMember.archivedAt !== undefined;
}

export function visibleStaffMembers(
  staffMembers: StaffMemberSummaryDto[],
  showArchived: boolean,
): StaffMemberSummaryDto[] {
  return showArchived
    ? staffMembers
    : staffMembers.filter((staffMember) => !isStaffMemberArchived(staffMember));
}

export function staffDeletionMessageKey(outcome: StaffMemberDeletionOutcome):
  | 'staff.deleted'
  | 'staff.archived' {
  return outcome === 'archived' ? 'staff.archived' : 'staff.deleted';
}
