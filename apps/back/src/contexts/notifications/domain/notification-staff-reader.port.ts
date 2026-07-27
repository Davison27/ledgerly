export const NOTIFICATION_STAFF_READER = Symbol('NotificationStaffReader');

export interface NotificationStaffDocumentRow {
  id: string;
  staffMemberId: string;
  staffMemberName: string;
  name: string;
  expiryDate: string;
}

export interface NotificationStaffReader {
  findExpiringUpTo(limitDate: string): Promise<NotificationStaffDocumentRow[]>;
}
