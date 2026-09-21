export const STAFF_MEMBER_PHYSICAL_DOCUMENT_REFERENCE_COUNTER = Symbol('StaffMemberPhysicalDocumentReferenceCounter');

export interface PhysicalDocumentReferenceCounter {
  countPhysicalDocumentReferences(staffMemberId: string): Promise<number>;
}
