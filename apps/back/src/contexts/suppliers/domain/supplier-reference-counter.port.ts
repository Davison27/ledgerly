export const SUPPLIER_REFERENCE_COUNTER = Symbol('SupplierReferenceCounter');

export interface SupplierReferenceCounter {
  count(supplierId: string): Promise<number>;
}
