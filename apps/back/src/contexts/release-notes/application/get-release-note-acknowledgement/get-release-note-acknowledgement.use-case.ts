import { Inject, Injectable } from '@nestjs/common';
import { RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY, ReleaseNoteAcknowledgementRepository } from '../../domain/release-note-acknowledgement.repository';
import { ReleaseNoteAcknowledgement, validateReleaseVersion } from '../../domain/release-note-acknowledgement';
import { GetReleaseNoteAcknowledgementCommand } from './get-release-note-acknowledgement.command';

@Injectable()
export class GetReleaseNoteAcknowledgementUseCase {
  constructor(
    @Inject(RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY)
    private readonly repository: ReleaseNoteAcknowledgementRepository,
  ) {}

  async execute(command: GetReleaseNoteAcknowledgementCommand): Promise<ReleaseNoteAcknowledgement | null> {
    validateReleaseVersion(command.releaseVersion);
    return this.repository.findByMemberAndVersion(command.workspaceMemberId, command.releaseVersion);
  }
}
