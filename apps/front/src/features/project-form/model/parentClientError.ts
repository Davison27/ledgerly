import type { QueryClient } from '@tanstack/react-query';
import {
  clientQueries,
  type ParentClientError,
} from '@/entities/client';
import { projectQueries } from '@/entities/project';

export function parentClientErrorMessageKey(
  error: ParentClientError,
):
  | 'projects.form.validation.clientRequired'
  | 'projects.form.clientUnavailable'
  | 'projects.form.clientArchivedConflict' {
  if (error === 'required') return 'projects.form.validation.clientRequired';
  if (error === 'archived') return 'projects.form.clientArchivedConflict';
  return 'projects.form.clientUnavailable';
}

export async function refreshParentClientCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clientQueries.all }),
    queryClient.invalidateQueries({ queryKey: projectQueries.all }),
  ]);
}
