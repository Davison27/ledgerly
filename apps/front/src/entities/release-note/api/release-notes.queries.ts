import { queryOptions } from '@tanstack/react-query';
import { getReleaseNoteAcknowledgement } from './release-notes.api';

export const releaseNoteQueries = {
  all: ['release-notes'] as const,
  acknowledgement: (version: string) =>
    queryOptions({
      queryKey: ['release-notes', 'acknowledgement', version] as const,
      queryFn: () => getReleaseNoteAcknowledgement(version),
    }),
};
