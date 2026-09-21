export const SUPPLIER_PHYSICAL_DOCUMENT_REFERENCE_COUNTER = Symbol('SupplierPhysicalDocumentReferenceCounter');

export interface PhysicalDocumentReferenceCounter {
  countPhysicalDocumentReferences(supplierId: string): Promise<number>;
}
