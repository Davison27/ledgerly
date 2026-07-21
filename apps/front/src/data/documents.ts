import type { DocumentDto } from './api/types';

export type DocumentType = 'factura' | 'nomina' | 'impuesto';
export type DocumentStatus = 'pagado' | 'pendiente' | 'vencido';
export type DocumentDirection = 'ingreso' | 'gasto';

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  direction: DocumentDirection;
  month: number;
  date: string;
  amount: number;
  status: DocumentStatus;
  /**
   * The status as STORED, without the `deriveEffectiveStatus` derivation.
   * `status` above stays derived and is what every read view (ficha, table,
   * tags) must keep using. `rawStatus` exists for exactly one purpose:
   * preloading the edit form's status selector — using `status` there would
   * turn a derived "vencido" into a persisted one on save (see D5 of the
   * document-crud plan). Do not use this field to paint anything.
   */
  rawStatus: DocumentStatus;
  issuerName?: string;
  issuerTaxId?: string;
  invoiceNumber?: string;
  dueDate?: string;
  taxBase?: number;
  taxRate?: number;
  taxAmount?: number;
  irpfRate?: number;
  irpfAmount?: number;
  currency?: string;
  hasFile?: boolean;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  /**
   * ⚠️ R8: without this field the edit form's supplier selector would always
   * render empty, and the payload it builds (`supplierId: values.supplierId
   * ?? null`) would send an explicit `null` on every save — silently
   * unassigning the supplier from any document that gets edited, even when
   * the user never touched the selector. See D2/R8 of the document-crud plan.
   */
  supplierId?: string | null;
}

export function mapDocumentDto(dto: DocumentDto): ProjectDocument {
  return {
    id: dto.id,
    projectId: dto.projectId,
    name: dto.name,
    type: dto.type,
    direction: dto.direction,
    month: dto.month,
    date: dto.date,
    amount: dto.amount,
    status: dto.status,
    rawStatus: dto.rawStatus,
    issuerName: dto.issuerName ?? undefined,
    issuerTaxId: dto.issuerTaxId ?? undefined,
    invoiceNumber: dto.invoiceNumber ?? undefined,
    dueDate: dto.dueDate ?? undefined,
    taxBase: dto.taxBase ?? undefined,
    taxRate: dto.taxRate ?? undefined,
    taxAmount: dto.taxAmount ?? undefined,
    irpfRate: dto.irpfRate ?? undefined,
    irpfAmount: dto.irpfAmount ?? undefined,
    currency: dto.currency ?? undefined,
    hasFile: dto.hasFile ?? false,
    fileName: dto.fileName ?? undefined,
    fileSize: dto.fileSize ?? undefined,
    mimeType: dto.mimeType ?? undefined,
    supplierId: dto.supplierId ?? undefined,
  };
}
