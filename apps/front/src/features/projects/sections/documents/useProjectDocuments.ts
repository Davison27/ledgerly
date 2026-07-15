import { useCallback, useEffect, useState } from 'react';
import { USE_MOCKS } from '../../../../config';
import { listDocuments } from '../../../../data/api/documents.api';
import {
  getProjectDocuments,
  mapDocumentDto,
  type ProjectDocument,
} from '../../../../data/documents';

interface UseProjectDocumentsResult {
  documents: ProjectDocument[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

export function useProjectDocuments(projectId: string): UseProjectDocumentsResult {
  const [documents, setDocuments] = useState<ProjectDocument[]>(() =>
    USE_MOCKS ? getProjectDocuments(projectId) : [],
  );
  const [loading, setLoading] = useState(!USE_MOCKS);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (USE_MOCKS) {
      setDocuments(getProjectDocuments(projectId));
      setLoading(false);
      setError(false);
      return;
    }

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
