import { ReleaseNoteAcknowledgement } from '../../domain/release-note-acknowledgement';
import { ReleaseNoteAcknowledgementOrmEntity } from './release-note-acknowledgement.orm-entity';

export class ReleaseNoteAcknowledgementMapper {
  static toDomain(orm: ReleaseNoteAcknowledgementOrmEntity): ReleaseNoteAcknowledgement {
    return ReleaseNoteAcknowledgement.create({
      workspaceMemberId: orm.workspaceMemberId,
      releaseVersion: orm.releaseVersion,
      acknowledgedAt: orm.acknowledgedAt,
    });
  }

  static toOrm(acknowledgement: ReleaseNoteAcknowledgement): ReleaseNoteAcknowledgementOrmEntity {
    const orm = new ReleaseNoteAcknowledgementOrmEntity();
    orm.workspaceMemberId = acknowledgement.getWorkspaceMemberId();
    orm.releaseVersion = acknowledgement.getReleaseVersion();
    orm.acknowledgedAt = acknowledgement.getAcknowledgedAt();
    return orm;
  }
}
