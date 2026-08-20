export interface CompanyDto {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  sector?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  logo?: string | null;
  brandColor?: string | null;
}

export interface CompanyBrandingDto {
  name: string;
  logo: string | null;
  brandColor: string | null;
}

export interface UpdateCompanyPayload {
  name?: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  logo?: string;
  brandColor?: string;
}

export interface CompanyDocumentTypeDto {
  id: string;
  code: string;
  name: string;
  expires?: boolean;
  defaultValidityMonths?: number | null;
  isSystem?: boolean;
}

export interface CompanyDocumentDto {
  id: string;
  typeId: string;
  name: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateCompanyDocumentPayload {
  typeId: string;
  name?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
}

export interface UpdateCompanyDocumentPayload {
  name?: string;
  issueDate?: string;
  expiryDate?: string | null;
  notes?: string | null;
}
