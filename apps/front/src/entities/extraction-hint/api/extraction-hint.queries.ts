import { queryOptions } from '@tanstack/react-query';
import { listExtractionHints } from './extraction-hints.api';
import { getExtractionQuality } from './extraction-quality.api';

export const extractionHintQueries = {
  all: ['extraction-hints'] as const,
  list: () =>
    queryOptions({
      queryKey: ['extraction-hints', 'list'] as const,
      queryFn: listExtractionHints,
    }),
  quality: () =>
    queryOptions({
      queryKey: ['extraction-hints', 'quality'] as const,
      queryFn: getExtractionQuality,
    }),
};
