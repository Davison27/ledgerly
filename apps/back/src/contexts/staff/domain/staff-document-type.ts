export interface StaffDocumentType {
  id: string;
  code: string;
  name: string;
  expires: boolean;
  defaultValidityMonths: number | null;
  isSystem: boolean;
}
