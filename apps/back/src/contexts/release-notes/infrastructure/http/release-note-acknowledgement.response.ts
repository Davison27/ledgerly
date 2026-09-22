import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';

export class ReleaseNoteAcknowledgementResponse {
  private constructor(
    readonly acknowledged: boolean,
    readonly acknowledgedAt: string | null,
  ) {}

  static fromAcknowledgement(
    acknowledgement: ReleaseNoteAcknowledgement | null,
  ): ReleaseNoteAcknowledgementResponse {
    return new ReleaseNoteAcknowledgementResponse(
      acknowledgement !== null,
      acknowledgement?.getAcknowledgedAt().toISOString() ?? null,
    );
  }
}
