import { queryOptions } from '@tanstack/react-query';
import {
  getStaffMember,
  listStaffDocumentTypes,
  listStaffDocuments,
  listStaffMembers,
} from './staff.api';

export const staffQueries = {
  all: ['staff'] as const,
  list: () =>
    queryOptions({
      queryKey: ['staff', 'list'] as const,
      queryFn: listStaffMembers,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['staff', 'detail', id] as const,
      queryFn: () => getStaffMember(id),
    }),
  documents: (staffMemberId: string, typeId?: string) =>
    queryOptions({
      queryKey: ['staff', 'documents', staffMemberId, typeId ?? null] as const,
      queryFn: () => listStaffDocuments(staffMemberId, typeId),
    }),
};

export const staffDocumentTypeQueries = {
  all: ['staff-document-types'] as const,
  list: () =>
    queryOptions({
      queryKey: ['staff-document-types'] as const,
      queryFn: listStaffDocumentTypes,
      staleTime: Infinity,
    }),
};
