import { Supplier } from './supplier';

export const SUPPLIER_REPOSITORY = Symbol('SupplierRepository');

export interface SupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: string): Promise<Supplier | null>;
  findByTaxId(taxId: string): Promise<Supplier | null>;
  save(supplier: Supplier): Promise<void>;
  archive(id: string): Promise<void>;
  unarchive?(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
