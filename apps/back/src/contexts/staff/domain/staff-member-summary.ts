import { StaffMemberPrimitives } from './staff-member';
import { StaffDocumentExpiryStatus } from './staff-document-expiry';

export interface StaffMemberSummary extends StaffMemberPrimitives {
  documentCount: number;
  earliestExpiryDate: string | null;
  documentStatus: StaffDocumentExpiryStatus;
}
