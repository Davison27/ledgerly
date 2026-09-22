import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import { RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY, ReleaseNoteAcknowledgementRepository } from '../../domain/release-note-acknowledgement.repository';
import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { AcknowledgeReleaseNoteCommand } from './acknowledge-release-note.command';

@Injectable()
export class AcknowledgeReleaseNoteUseCase {
  constructor(
    @Inject(RELEASE_NOTE_ACKNOWLEDGEMENT_REPOSITORY)
    private readonly repository: ReleaseNoteAcknowledgementRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: AcknowledgeReleaseNoteCommand): Promise<void> {
    const acknowledgement = ReleaseNoteAcknowledgement.create({
      workspaceMemberId: command.workspaceMemberId,
      releaseVersion: command.releaseVersion,
      acknowledgedAt: this.clock.now(),
    });

    await this.repository.insertIfAbsent(acknowledgement);
  }
}
