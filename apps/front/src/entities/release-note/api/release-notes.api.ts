import { get, post } from '@/shared/api/httpClient';
import type { ReleaseNoteAcknowledgement } from './types';

export function getReleaseNoteAcknowledgement(version: string): Promise<ReleaseNoteAcknowledgement> {
  return get<ReleaseNoteAcknowledgement>(
    `/release-notes/${encodeURIComponent(version)}/acknowledgement`,
  );
}

export function acknowledgeReleaseNote(version: string): Promise<void> {
  return post<void>(`/release-notes/${encodeURIComponent(version)}/acknowledgement`);
}
