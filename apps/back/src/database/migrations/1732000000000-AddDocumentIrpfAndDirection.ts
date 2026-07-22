import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentIrpfAndDirection1732000000000 implements MigrationInterface {
  name = 'AddDocumentIrpfAndDirection1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "irpf_rate" numeric(5,2),
        ADD COLUMN "irpf_amount" numeric(12,2),
        ADD COLUMN "direction" varchar(16) NOT NULL DEFAULT 'gasto'
    `);

    await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "direction" DROP DEFAULT`);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "CHK_documents_irpf_rate" CHECK ("irpf_rate" IS NULL OR "irpf_rate" >= 0),
        ADD CONSTRAINT "CHK_documents_irpf_amount" CHECK ("irpf_amount" IS NULL OR "irpf_amount" >= 0),
        ADD CONSTRAINT "CHK_documents_direction" CHECK ("direction" IN ('ingreso', 'gasto'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP CONSTRAINT "CHK_documents_direction",
        DROP CONSTRAINT "CHK_documents_irpf_amount",
        DROP CONSTRAINT "CHK_documents_irpf_rate"
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        DROP COLUMN "direction",
        DROP COLUMN "irpf_amount",
        DROP COLUMN "irpf_rate"
    `);
  }
}
