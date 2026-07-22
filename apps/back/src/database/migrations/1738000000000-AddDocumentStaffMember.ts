import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentStaffMember1738000000000 implements MigrationInterface {
  name = 'AddDocumentStaffMember1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "staff_member_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "FK_documents_staff_member" FOREIGN KEY ("staff_member_id")
          REFERENCES "staff_members" ("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_documents_staff_member_id" ON "documents" ("staff_member_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD CONSTRAINT "CHK_documents_payroll_staff"
        CHECK ("type" <> 'nomina' OR "staff_member_id" IS NOT NULL) NOT VALID
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "CHK_documents_payroll_staff"`);
    await queryRunner.query(`DROP INDEX "IDX_documents_staff_member_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_staff_member"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "staff_member_id"`);
  }
}
