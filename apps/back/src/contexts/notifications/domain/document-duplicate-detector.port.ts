export const DOCUMENT_DUPLICATE_DETECTOR = Symbol('DocumentDuplicateDetector');

export interface DuplicateDetectionCriteria {
  documentId: string;
  invoiceNumber: string;
  amount: number;
  issuerName: string | null;
  issuerTaxId: string | null;
}

export interface DocumentDuplicateDetector {
  hasDuplicates(criteria: DuplicateDetectionCriteria): Promise<boolean>;
}
