export interface SupplierDto {
  id: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  iban?: string | null;
  notes?: string | null;
}

export interface CreateSupplierPayload {
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
  notes?: string;
}
