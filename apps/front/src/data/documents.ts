import { USE_MOCKS } from '../config';
import { generateProjectDocuments } from './mocks/documents.mock';

export type {
  ProjectDocument,
  DocumentType,
  DocumentStatus,
} from './mocks/documents.mock';

export function getProjectDocuments(projectId: string) {
  return USE_MOCKS ? generateProjectDocuments(projectId) : [];
}
