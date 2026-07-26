import { queryOptions } from '@tanstack/react-query';
import { checkDuplicate, getDocument, listAllDocuments, listDocuments } from './documents.api';
import type { DocumentListFiltersDto, DuplicateCheckParams } from './types';
import { mapDocumentDto } from '../model/documents';

export const documentQueries = {
  all: ['documents'] as const,
  list: (filters: DocumentListFiltersDto = {}) =>
    queryOptions({
      queryKey: ['documents', 'list', filters] as const,
      queryFn: () => listAllDocuments(filters),
    }),
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: ['documents', 'project', projectId] as const,
      queryFn: () => listDocuments(projectId).then((dtos) => dtos.map(mapDocumentDto)),
    }),
  detail: (projectId: string, id: string) =>
    queryOptions({
      queryKey: ['documents', 'detail', projectId, id] as const,
      queryFn: () => getDocument(projectId, id).then(mapDocumentDto),
    }),
  duplicateCheck: (params: DuplicateCheckParams) =>
    queryOptions({
      queryKey: ['documents', 'duplicate-check', params] as const,
      queryFn: () => checkDuplicate(params),
    }),
};
