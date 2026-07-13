import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "sector" varchar(120) NOT NULL,
        "color" varchar(7) NOT NULL,
        CONSTRAINT "PK_companies" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_companies_color" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "code" varchar(40) NOT NULL,
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_projects_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "type" varchar(16) NOT NULL,
        "month" smallint NOT NULL,
        "date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" varchar(16) NOT NULL,
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_documents_type" CHECK ("type" IN ('factura', 'nomina', 'impuesto')),
        CONSTRAINT "CHK_documents_status" CHECK ("status" IN ('pagado', 'pendiente', 'vencido')),
        CONSTRAINT "CHK_documents_month" CHECK ("month" BETWEEN 1 AND 12),
        CONSTRAINT "CHK_documents_amount" CHECK ("amount" >= 0),
        CONSTRAINT "FK_documents_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_documents_project_id" ON "documents" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_project_id_date" ON "documents" ("project_id", "date" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_pending" ON "documents" ("project_id") WHERE "status" = 'pendiente'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
