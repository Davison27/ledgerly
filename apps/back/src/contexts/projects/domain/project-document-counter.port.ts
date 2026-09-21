export const PROJECT_DOCUMENT_COUNTER = Symbol('ProjectDocumentCounter');

export interface ProjectDocumentCounter {
  count(projectId: string): Promise<number>;
}
