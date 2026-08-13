import { SupplierPrimitives } from './supplier';

export interface SupplierSpend {
  currency: string;
  total: number;
}

export interface SupplierSummary extends SupplierPrimitives {
  documentCount: number;
  spend: SupplierSpend[];
}
