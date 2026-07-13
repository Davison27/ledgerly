import { USE_MOCKS } from '../config';
import { generateProjectDocuments } from './mocks/documents.mock';

export type {
  ProjectDocument,
  DocumentType,
  DocumentStatus,
} from './mocks/documents.mock';

// Fuente de datos de documentos de un proyecto.
// TODO: sustituir por una llamada al backend cuando esté disponible.
// De momento solo hay mocks, que únicamente se cargan en modo local.
export function getProjectDocuments(projectId: string) {
  return USE_MOCKS ? generateProjectDocuments(projectId) : [];
}
