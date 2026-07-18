import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtractionOutcomes1730000000000 implements MigrationInterface {
  name = 'AddExtractionOutcomes1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "extraction_outcomes" (
        "id" uuid NOT NULL,
        "source" varchar(16) NOT NULL,
        "confidence" varchar(16) NOT NULL,
        "corrected_fields" integer NOT NULL,
        "issuer_name" varchar(200),
        "created_at" timestamptz NOT NULL,
        CONSTRAINT "PK_extraction_outcomes" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "extraction_outcomes"`);
  }
}
