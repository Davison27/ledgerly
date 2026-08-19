import { queryOptions } from '@tanstack/react-query';
import {
  checkDuplicate,
  checkDuplicatePage,
  getDocument,
  listAllDocuments,
  listAllDocumentsPage,
  listDocuments,
  listDocumentsPage,
} from './documents.api';
import type { DocumentListFiltersDto, DuplicateCheckParams } from './types';
import { mapDocumentDto } from '../model/documents';

export const documentQueries = {
  all: ['documents'] as const,
  list: (filters: DocumentListFiltersDto = {}) =>
    queryOptions({
      queryKey: ['documents', 'list', filters] as const,
      queryFn: () => listAllDocuments(filters),
    }),
  listPage: (filters: DocumentListFiltersDto = {}, page = 1, size = 20) =>
    queryOptions({
      queryKey: ['documents', 'list-page', filters, page, size] as const,
      queryFn: () => listAllDocumentsPage(filters, page, size),
    }),
  byProject: (projectId: string) =>
    queryOptions({
      queryKey: ['documents', 'project', projectId] as const,
      queryFn: () => listDocuments(projectId).then((dtos) => dtos.map(mapDocumentDto)),
    }),
  byProjectPage: (projectId: string, page = 1, size = 20) =>
    queryOptions({
      queryKey: ['documents', 'project-page', projectId, page, size] as const,
      queryFn: () => listDocumentsPage(projectId, {}, page, size).then((result) => ({
        ...result,
        items: result.items.map(mapDocumentDto),
      })),
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
  duplicateCheckPage: (params: DuplicateCheckParams, page = 1, size = 20) =>
    queryOptions({
      queryKey: ['documents', 'duplicate-check-page', params, page, size] as const,
      queryFn: () => checkDuplicatePage(params, page, size),
    }),
};
