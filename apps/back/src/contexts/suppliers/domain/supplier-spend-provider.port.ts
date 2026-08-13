export const SUPPLIER_SPEND_PROVIDER = Symbol('SupplierSpendProvider');

export interface SupplierSpendRow {
  supplierId: string;
  currency: string;
  total: number;
  documentCount: number;
}

export interface SupplierSpendProvider {
  findAll(): Promise<SupplierSpendRow[]>;
}
