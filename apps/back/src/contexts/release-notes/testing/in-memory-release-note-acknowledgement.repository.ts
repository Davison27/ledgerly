import { ReleaseNoteAcknowledgement } from '../domain/release-note-acknowledgement';
import { ReleaseNoteAcknowledgementRepository } from '../domain/release-note-acknowledgement.repository';

export class InMemoryReleaseNoteAcknowledgementRepository implements ReleaseNoteAcknowledgementRepository {
  private readonly acknowledgements = new Map<string, ReleaseNoteAcknowledgement>();

  constructor(acknowledgements: ReleaseNoteAcknowledgement[] = []) {
    for (const acknowledgement of acknowledgements) {
      this.acknowledgements.set(this.key(
        acknowledgement.getWorkspaceMemberId(),
        acknowledgement.getReleaseVersion(),
      ), acknowledgement);
    }
  }

  findByMemberAndVersion(workspaceMemberId: string, releaseVersion: string): Promise<ReleaseNoteAcknowledgement | null> {
    return Promise.resolve(this.acknowledgements.get(this.key(workspaceMemberId, releaseVersion)) ?? null);
  }

  insertIfAbsent(acknowledgement: ReleaseNoteAcknowledgement): Promise<void> {
    const key = this.key(acknowledgement.getWorkspaceMemberId(), acknowledgement.getReleaseVersion());
    if (!this.acknowledgements.has(key)) this.acknowledgements.set(key, acknowledgement);
    return Promise.resolve();
  }

  get values(): ReleaseNoteAcknowledgement[] {
    return [...this.acknowledgements.values()];
  }

  private key(workspaceMemberId: string, releaseVersion: string): string {
    return `${workspaceMemberId}:${releaseVersion}`;
  }
}
