import { StaffMemberSummary } from '../../domain/staff-member-summary';

export class StaffMemberSummaryResponse {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  hireDate: string | null;
  endDate: string | null;
  notes: string | null;
  documentCount: number;
  earliestExpiryDate: string | null;
  documentStatus: StaffMemberSummary['documentStatus'];

  static fromSummary(summary: StaffMemberSummary): StaffMemberSummaryResponse {
    const response = new StaffMemberSummaryResponse();

    response.id = summary.id;
    response.firstName = summary.firstName;
    response.lastName = summary.lastName;
    response.taxId = summary.taxId;
    response.email = summary.email;
    response.phone = summary.phone;
    response.position = summary.position;
    response.hireDate = summary.hireDate;
    response.endDate = summary.endDate;
    response.notes = summary.notes;
    response.documentCount = summary.documentCount;
    response.earliestExpiryDate = summary.earliestExpiryDate;
    response.documentStatus = summary.documentStatus;

    return response;
  }
}
