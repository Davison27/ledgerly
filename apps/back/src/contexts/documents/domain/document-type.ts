export type DocumentType = 'factura' | 'nomina' | 'impuesto';

export const DOCUMENT_TYPES: DocumentType[] = ['factura', 'nomina', 'impuesto'];

export const CREATABLE_DOCUMENT_TYPES = ['factura', 'impuesto'] as const;

export type CreatableDocumentType = (typeof CREATABLE_DOCUMENT_TYPES)[number];

export function isCreatableDocumentType(type: string): type is CreatableDocumentType {
  return CREATABLE_DOCUMENT_TYPES.includes(type as CreatableDocumentType);
}
