import { useQuery } from '@tanstack/react-query';
import { documentQueries, type ProjectDocument } from '@/entities/document';

interface UseProjectDocumentsResult {
  documents: ProjectDocument[];
  loading: boolean;
  error: boolean;
}

export function useProjectDocuments(projectId: string): UseProjectDocumentsResult {
  const { data, isPending, isError } = useQuery(documentQueries.byProject(projectId));
  return { documents: data ?? [], loading: isPending, error: isError };
}
