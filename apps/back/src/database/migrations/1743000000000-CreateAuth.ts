import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuth1743000000000 implements MigrationInterface {
  name = 'CreateAuth1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL,
        "email" varchar(320) NOT NULL,
        "google_subject" varchar(64),
        "name" varchar(160) NOT NULL,
        "role" varchar(16) NOT NULL,
        "permissions" jsonb NOT NULL,
        "status" varchar(16) NOT NULL,
        "is_founder" boolean NOT NULL DEFAULT false,
        "invited_at" timestamptz NOT NULL DEFAULT now(),
        "joined_at" timestamptz,
        "last_active_at" timestamptz,
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_members_email" UNIQUE ("email"),
        CONSTRAINT "UQ_workspace_members_google_subject" UNIQUE ("google_subject")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_workspace_members_single_founder"
        ON "workspace_members" ("is_founder") WHERE "is_founder"
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL,
        "member_id" uuid NOT NULL REFERENCES "workspace_members"("id") ON DELETE CASCADE,
        "token_hash" char(64) NOT NULL,
        "csrf_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_member_id" ON "sessions" ("member_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_expires_at" ON "sessions" ("expires_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_login_attempts" (
        "id" uuid NOT NULL,
        "transaction_hash" char(64) NOT NULL,
        "state_hash" char(64) NOT NULL,
        "code_verifier" varchar(128) NOT NULL,
        "nonce" varchar(64) NOT NULL,
        "redirect_to" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        CONSTRAINT "PK_oauth_login_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_login_attempts_transaction_hash" UNIQUE ("transaction_hash")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_oauth_login_attempts_expires_at" ON "oauth_login_attempts" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "oauth_login_attempts"
    `);
    await queryRunner.query(`
      DROP TABLE "sessions"
    `);
    await queryRunner.query(`
      DROP TABLE "workspace_members"
    `);
  }
}
