import type { DocumentDto } from './api/types';

export type DocumentType = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatus = 'pagado' | 'pendiente' | 'vencido';

export interface ProjectDocument {
  id: string;
  name: string;
  type: DocumentType;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  issuerName?: string;
  issuerTaxId?: string;
  invoiceNumber?: string;
  dueDate?: string;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  currency?: string;
  hasFile?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

export function mapDocumentDto(dto: DocumentDto): ProjectDocument {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    month: dto.month,
    date: dto.date,
    amount: dto.amount,
    status: dto.status,
    issuerName: dto.issuerName ?? undefined,
    issuerTaxId: dto.issuerTaxId ?? undefined,
    invoiceNumber: dto.invoiceNumber ?? undefined,
    dueDate: dto.dueDate ?? undefined,
    taxBase: dto.taxBase ?? undefined,
    taxRate: dto.taxRate ?? undefined,
    taxAmount: dto.taxAmount ?? undefined,
    currency: dto.currency ?? undefined,
    hasFile: dto.hasFile ?? false,
    fileName: dto.fileName ?? undefined,
    fileSize: dto.fileSize ?? undefined,
    mimeType: dto.mimeType ?? undefined,
  };
}
