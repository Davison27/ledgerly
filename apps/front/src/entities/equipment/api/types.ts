export interface EquipmentDto {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  reference: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  image: string | null;
  tags: string[];
  leasingMonthlyFee: number | null;
}

export interface CreateEquipmentPayload {
  name: string;
  price?: number;
  stock?: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
  leasingMonthlyFee?: number | null;
}

export interface UpdateEquipmentPayload {
  name?: string;
  price?: number;
  stock?: number;
  reference?: string | null;
  category?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  tags?: string[];
  leasingMonthlyFee?: number | null;
}

export interface EquipmentDocumentDto {
  id: string;
  equipmentId: string;
  name: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateEquipmentDocumentPayload {
  name?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateEquipmentDocumentPayload {
  name?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}
