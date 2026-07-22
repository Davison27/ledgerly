import { useCallback, useEffect, useState } from 'react';
import { listDocuments, mapDocumentDto, type ProjectDocument } from '@/entities/document';

interface UseProjectDocumentsResult {
  documents: ProjectDocument[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

export function useProjectDocuments(projectId: string): UseProjectDocumentsResult {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listDocuments(projectId)
      .then((dtos) => {
        if (!cancelled) setDocuments(dtos.map(mapDocumentDto));
      })
      .catch(() => {
        if (!cancelled) {
          setDocuments([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, reloadToken]);

  return { documents, loading, error, reload };
}
