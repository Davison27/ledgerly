export const SUPPLIER_EXISTENCE_CHECKER = Symbol('SupplierExistenceChecker');

export interface SupplierExistenceChecker {
  exists(supplierId: string): Promise<boolean>;
}
