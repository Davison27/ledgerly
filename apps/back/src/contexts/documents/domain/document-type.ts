export type DocumentType = 'invoice' | 'payroll' | 'tax';

export const DOCUMENT_TYPES: DocumentType[] = ['invoice', 'payroll', 'tax'];

export const CREATABLE_DOCUMENT_TYPES = ['invoice', 'tax'] as const;

export type CreatableDocumentType = (typeof CREATABLE_DOCUMENT_TYPES)[number];

export function isCreatableDocumentType(type: string): type is CreatableDocumentType {
  return CREATABLE_DOCUMENT_TYPES.includes(type as CreatableDocumentType);
}
