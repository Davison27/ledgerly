import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentFiles1724000000000 implements MigrationInterface {
  name = 'AddDocumentFiles1724000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "file_name" varchar(255),
        ADD COLUMN "mime_type" varchar(100),
        ADD COLUMN "file_size" integer,
        ADD COLUMN "content" bytea
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "CHK_documents_file_size" CHECK ("file_size" IS NULL OR "file_size" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT "CHK_documents_file_size"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN "content",
        DROP COLUMN "file_size",
        DROP COLUMN "mime_type",
        DROP COLUMN "file_name"
    `);
  }
}
