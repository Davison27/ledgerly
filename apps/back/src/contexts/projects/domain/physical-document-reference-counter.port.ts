export const PROJECT_PHYSICAL_DOCUMENT_REFERENCE_COUNTER = Symbol('ProjectPhysicalDocumentReferenceCounter');

export interface PhysicalDocumentReferenceCounter {
  countPhysicalDocumentReferences(projectId: string): Promise<number>;
}
