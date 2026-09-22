import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReleaseNoteAcknowledgements1730000012000 implements MigrationInterface {
  name = 'CreateReleaseNoteAcknowledgements1730000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "release_note_acknowledgements" (
        "workspace_member_id" uuid NOT NULL,
        "release_version" varchar NOT NULL,
        "acknowledged_at" timestamptz NOT NULL,
        CONSTRAINT "PK_release_note_acknowledgements" PRIMARY KEY ("workspace_member_id", "release_version"),
        CONSTRAINT "CHK_release_note_acknowledgements_version" CHECK ("release_version" ~ '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$'),
        CONSTRAINT "FK_release_note_acknowledgements_workspace_member" FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "release_note_acknowledgements"');
  }
}
