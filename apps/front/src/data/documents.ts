import { USE_MOCKS } from '../config';
import type { DocumentDto } from './api/types';
import { generateProjectDocuments } from './mocks/documents.mock';
import type { ProjectDocument } from './mocks/documents.mock';

export type {
  ProjectDocument,
  DocumentType,
  DocumentStatus,
} from './mocks/documents.mock';

export function getProjectDocuments(projectId: string): ProjectDocument[] {
  return USE_MOCKS ? generateProjectDocuments(projectId) : [];
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
