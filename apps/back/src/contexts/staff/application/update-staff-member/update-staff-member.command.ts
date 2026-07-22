export interface UpdateStaffMemberCommand {
  id: string;
  firstName?: string;
  lastName?: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  hireDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}
