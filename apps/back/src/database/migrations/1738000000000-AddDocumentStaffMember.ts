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

    // D3/D4: a payroll (`type = 'nomina'`) must carry a staff member, but the
    // constraint is added `NOT VALID` on purpose. `NOT VALID` skips scanning
    // existing rows, so it cannot fail against any database that already has
    // payrolls without a staff member (the seed and the demo loader both
    // created them before this migration). From here on every INSERT/UPDATE
    // is checked. Do NOT follow this with `VALIDATE CONSTRAINT`: that would
    // scan and fail on exactly the legacy rows this migration is designed to
    // tolerate (R6 of the staff-section plan).
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
