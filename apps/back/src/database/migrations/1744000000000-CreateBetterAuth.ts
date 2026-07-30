import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBetterAuth1744000000000 implements MigrationInterface {
  name = 'CreateBetterAuth1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "user" ("id" varchar NOT NULL, "name" varchar NOT NULL, "email" varchar NOT NULL, "emailVerified" boolean NOT NULL, "image" varchar, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, CONSTRAINT "PK_better_auth_user" PRIMARY KEY ("id"), CONSTRAINT "UQ_better_auth_user_email" UNIQUE ("email"))`);
    await queryRunner.query(`CREATE TABLE "session" ("id" varchar NOT NULL, "expiresAt" timestamptz NOT NULL, "token" varchar NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, "ipAddress" varchar, "userAgent" varchar, "userId" varchar NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, CONSTRAINT "PK_better_auth_session" PRIMARY KEY ("id"), CONSTRAINT "UQ_better_auth_session_token" UNIQUE ("token"))`);
    await queryRunner.query(`CREATE INDEX "IDX_better_auth_session_user" ON "session" ("userId")`);
    await queryRunner.query(`CREATE TABLE "account" ("id" varchar NOT NULL, "accountId" varchar NOT NULL, "providerId" varchar NOT NULL, "userId" varchar NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "accessToken" varchar, "refreshToken" varchar, "idToken" varchar, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" varchar, "password" varchar, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, CONSTRAINT "PK_better_auth_account" PRIMARY KEY ("id"), CONSTRAINT "UQ_better_auth_account_provider" UNIQUE ("providerId", "accountId"))`);
    await queryRunner.query(`CREATE INDEX "IDX_better_auth_account_user" ON "account" ("userId")`);
    await queryRunner.query(`CREATE TABLE "verification" ("id" varchar NOT NULL, "identifier" varchar NOT NULL, "value" varchar NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, CONSTRAINT "PK_better_auth_verification" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_better_auth_verification_identifier" ON "verification" ("identifier")`);
    await queryRunner.query(`CREATE TABLE "rateLimit" ("key" varchar NOT NULL, "count" integer NOT NULL, "lastRequest" bigint NOT NULL, CONSTRAINT "PK_better_auth_rate_limit" PRIMARY KEY ("key"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rateLimit"`);
    await queryRunner.query(`DROP TABLE "verification"`);
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
