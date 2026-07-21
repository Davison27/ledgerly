import { MigrationInterface, QueryRunner } from 'typeorm';

// UUIDs literales y fijos (no generados) para los 8 tipos de documento de
// personal sembrados por esta migración (D1 del plan de staff): así el
// dominio nunca conoce sus códigos, pero cualquier instalación arranca con
// el mismo catálogo semilla y los mismos ids.
const STAFF_DOCUMENT_TYPE_IDS = {
  dni: '6c2e74ac-b547-40ee-ab31-5c10c490cbcf',
  foto: '5f9a1985-8d8d-4560-84df-f62b683d9396',
  prl: '918e8fd1-6779-40ca-8017-f58bcd80dfed',
  art19: '50400f16-275d-4030-b4f2-00c58f2cf677',
  epis: '18e6cc3b-52fb-482d-997b-729a707ba7ff',
  renuncia_reco: '94ec24ab-bd3a-4231-9602-4ed85da3c8dd',
  reta_recibo: 'e9080e8a-2846-4104-9330-39e1234127e5',
  varios: '152b0f57-363d-4691-a65b-69262b13978e',
};

export class CreateStaff1737000000000 implements MigrationInterface {
  name = 'CreateStaff1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "staff_members" (
        "id" uuid NOT NULL,
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "tax_id" varchar(40),
        "email" varchar(200),
        "phone" varchar(40),
        "position" varchar(120),
        "hire_date" date,
        "end_date" date,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_members" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_staff_members_dates" CHECK ("end_date" IS NULL OR "hire_date" IS NULL OR "end_date" >= "hire_date")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "staff_document_types" (
        "id" uuid NOT NULL,
        "code" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "expires" boolean NOT NULL DEFAULT true,
        "default_validity_months" smallint,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_staff_document_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_document_types_code" UNIQUE ("code")
      )
    `);

    // Semilla de los 8 tipos de D1. `default_validity_months` se deja NULL
    // para todos (decisión de David): inventar plazos legales haría mentir
    // al futuro aviso de renovación; la columna existe porque ese aviso la
    // necesitará, pero la fecha de caducidad la escribe el usuario.
    await queryRunner.query(
      `INSERT INTO "staff_document_types" ("id", "code", "name", "expires", "default_validity_months", "is_system") VALUES
        ('${STAFF_DOCUMENT_TYPE_IDS.dni}', 'dni', 'DNI', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.foto}', 'foto', 'Foto', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.prl}', 'prl', 'Formación PRL', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.art19}', 'art19', 'Artículo 19', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.epis}', 'epis', 'EPIs', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.renuncia_reco}', 'renuncia_reco', 'Renuncia RECO', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.reta_recibo}', 'reta_recibo', 'Recibo RETA', true, NULL, true),
        ('${STAFF_DOCUMENT_TYPE_IDS.varios}', 'varios', 'Varios', false, NULL, true)
      `,
    );

    await queryRunner.query(`
      CREATE TABLE "staff_documents" (
        "id" uuid NOT NULL,
        "staff_member_id" uuid NOT NULL,
        "type_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "issue_date" date NOT NULL,
        "expiry_date" date,
        "notes" text,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" integer NOT NULL,
        "content" bytea,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_documents" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_staff_documents_expiry" CHECK ("expiry_date" IS NULL OR "expiry_date" >= "issue_date"),
        CONSTRAINT "FK_staff_documents_staff_member" FOREIGN KEY ("staff_member_id")
          REFERENCES "staff_members" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_staff_documents_type" FOREIGN KEY ("type_id")
          REFERENCES "staff_document_types" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_staff_documents_staff_member_id" ON "staff_documents" ("staff_member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_documents_staff_member_id_type_id" ON "staff_documents" ("staff_member_id", "type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_documents_expiry_date" ON "staff_documents" ("expiry_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "staff_documents"`);
    await queryRunner.query(`DROP TABLE "staff_document_types"`);
    await queryRunner.query(`DROP TABLE "staff_members"`);
  }
}
