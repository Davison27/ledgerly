export interface UpdateSupplierCommand {
  id: string;
  name?: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  iban?: string | null;
  notes?: string | null;
}
