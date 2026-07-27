import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1742000000000 implements MigrationInterface {
  name = 'CreateNotifications1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL,
        "dedupe_key" varchar(200) NOT NULL,
        "type" varchar(48) NOT NULL,
        "severity" varchar(16) NOT NULL,
        "subject" varchar(200) NOT NULL,
        "related" varchar(200),
        "context_date" date,
        "context_amount" numeric(12,2),
        "context_conflict_kind" varchar(32),
        "resource_kind" varchar(24) NOT NULL,
        "resource_id" uuid,
        "resource_project_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "read_at" timestamptz,
        "email_sent_at" timestamptz,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notifications_dedupe_key" UNIQUE ("dedupe_key")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_read_at" ON "notifications" ("read_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "notifications"
    `);
  }
}
