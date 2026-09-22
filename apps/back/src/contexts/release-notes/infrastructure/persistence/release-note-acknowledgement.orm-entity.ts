import { Check, Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { WorkspaceMemberOrmEntity } from '../../../auth/infrastructure/persistence/workspace-member.orm-entity';

export const RELEASE_NOTE_ACKNOWLEDGEMENT_VERSION_CHECK =
  `"release_version" ~ '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$'`;

@Entity('release_note_acknowledgements')
@Check('CHK_release_note_acknowledgements_version', RELEASE_NOTE_ACKNOWLEDGEMENT_VERSION_CHECK)
export class ReleaseNoteAcknowledgementOrmEntity {
  @PrimaryColumn({
    name: 'workspace_member_id',
    type: 'uuid',
    primaryKeyConstraintName: 'PK_release_note_acknowledgements',
  })
  @ForeignKey(() => WorkspaceMemberOrmEntity, {
    name: 'FK_release_note_acknowledgements_workspace_member',
    onDelete: 'CASCADE',
  })
  workspaceMemberId: string;

  @PrimaryColumn({
    name: 'release_version',
    type: 'varchar',
    primaryKeyConstraintName: 'PK_release_note_acknowledgements',
  })
  releaseVersion: string;

  @Column({ name: 'acknowledged_at', type: 'timestamptz' })
  acknowledgedAt: Date;
}
