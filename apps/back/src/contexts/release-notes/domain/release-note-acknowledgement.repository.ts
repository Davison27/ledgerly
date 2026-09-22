import { ReleaseNoteAcknowledgement } from './release-note-acknowledgement';

export const RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY = Symbol('ReleaseNoteAcknowledgementRepository');

export interface ReleaseNoteAcknowledgementRepository {
  findByMemberAndVersion(workspaceMemberId: string, releaseVersion: string): Promise<ReleaseNoteAcknowledgement | null>;
  insertIfAbsent(acknowledgement: ReleaseNoteAcknowledgement): Promise<void>;
}
