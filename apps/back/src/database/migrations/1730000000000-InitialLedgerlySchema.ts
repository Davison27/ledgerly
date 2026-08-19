import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialLedgerlySchema1730000000000 implements MigrationInterface {
  name = 'InitialLedgerlySchema1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "legal_name" varchar(160),
        "tax_id" varchar(40),
        "sector" varchar(120),
        "email" varchar(160),
        "phone" varchar(40),
        "website" varchar(255),
        "address" varchar(255),
        "city" varchar(120),
        "postal_code" varchar(20),
        "country" varchar(120),
        "logo" text,
        "brand_color" varchar(7),
        CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id")
      )
    `);
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
        "invited_at" timestamptz NOT NULL,
        "joined_at" timestamptz,
        "last_active_at" timestamptz,
        CONSTRAINT "PK_22ab43ac5865cd62769121d2bc4" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "security_audit_logs" (
        "id" uuid NOT NULL,
        "event" varchar(64) NOT NULL,
        "subject_id" varchar(128),
        "metadata" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_c102bef9bbc2775cec64a76c675" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "tax_id" varchar(40),
        "email" varchar(160),
        "phone" varchar(40),
        "address" varchar(255),
        "iban" varchar(34),
        "notes" text,
        CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id")
      )
    `);
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
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_cdad75efe024402db5d51140960" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "staff_document_types" (
        "id" uuid NOT NULL,
        "code" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "expires" boolean NOT NULL,
        "default_validity_months" smallint,
        "is_system" boolean NOT NULL,
        CONSTRAINT "PK_b59006974c416e0aad6451caf8e" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "price" numeric(12,2),
        "stock" integer NOT NULL,
        "reference" varchar(100),
        "category" varchar(100),
        "brand" varchar(100),
        "description" text,
        "image" text,
        "tags" text[] NOT NULL DEFAULT '{}',
        "leasing_monthly_fee" numeric(12,2),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "code" varchar(40) NOT NULL,
        "type" varchar(20) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "description" text,
        "client_company" varchar(160),
        "client_tax_id" varchar(40),
        "contact_name" varchar(160),
        "contact_email" varchar(160),
        "contact_phone" varchar(40),
        "address" varchar(255),
        "start_date" date,
        "end_date" date,
        "budget" numeric(12,2),
        "currency" varchar(3) NOT NULL DEFAULT 'EUR',
        "fiscal_year" varchar(10),
        "manager" varchar(160),
        "image" text,
        "color" varchar(20),
        "is_demo" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_d95a87318392465ab663a32cc4" ON "projects" ("code")');
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
        "issuer_name" varchar(200),
        "issuer_tax_id" varchar(40),
        "invoice_number" varchar(80),
        "due_date" date,
        "tax_base" numeric(12,2),
        "tax_rate" numeric(5,2),
        "tax_amount" numeric(12,2),
        "irpf_rate" numeric(5,2),
        "irpf_amount" numeric(12,2),
        "currency" varchar(3) NOT NULL,
        "file_name" varchar(255),
        "mime_type" varchar(100),
        "file_size" integer,
        "content" bytea,
        "supplier_id" uuid,
        "staff_member_id" uuid,
        "direction" varchar(16) NOT NULL,
        CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL,
        "series" varchar(10) NOT NULL,
        "year" integer NOT NULL,
        "number" integer NOT NULL,
        "issue_date" date NOT NULL,
        "project_id" uuid NOT NULL,
        "customer_name" varchar(200) NOT NULL,
        "customer_tax_id" varchar(40),
        "customer_address" varchar(255),
        "tax_base" numeric(12,2) NOT NULL,
        "tax_rate" numeric(5,2) NOT NULL,
        "tax_amount" numeric(12,2) NOT NULL,
        "irpf_rate" numeric(5,2) NOT NULL,
        "irpf_amount" numeric(12,2) NOT NULL,
        "total" numeric(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "notes" text,
        "pdf" bytea,
        "pdf_size" integer,
        "document_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "invoice_lines" (
        "id" uuid NOT NULL,
        "invoice_id" uuid NOT NULL,
        "position" smallint NOT NULL,
        "description" varchar(200) NOT NULL,
        "unit_price" numeric(12,2) NOT NULL,
        "quantity" numeric(12,3) NOT NULL,
        "product_id" uuid,
        CONSTRAINT "PK_3d18eb48142b916f581f0c21a65" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "project_products" (
        "project_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "lease_expense" numeric(12,2),
        "lease_expense_date" date,
        CONSTRAINT "PK_471ea4e27ea35bbe9cbb346793b" PRIMARY KEY ("project_id", "product_id")
      )
    `);
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
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_839ead62045ac25f73271e6823d" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_events" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "title" varchar(120),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_c14624cf0aa0f238ace86e789aa" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_event_days" (
        "id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" time,
        "end_time" time,
        CONSTRAINT "PK_865a7192a57b8572fe98cbb4eeb" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_event_products" (
        "event_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        CONSTRAINT "PK_e7c4f14a7dcc225f662aee406e0" PRIMARY KEY ("event_id", "product_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_event_staff" (
        "event_id" uuid NOT NULL,
        "staff_member_id" uuid NOT NULL,
        CONSTRAINT "PK_08709d272cfa70d066aca3f21f3" PRIMARY KEY ("event_id", "staff_member_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "invoice_extraction_hints" (
        "id" uuid NOT NULL,
        "issuer_name" varchar(200) NOT NULL,
        "field" varchar(32) NOT NULL,
        "anchor_kind" varchar(16) NOT NULL,
        "anchor_label" varchar(200) NOT NULL,
        "line_offset" integer NOT NULL DEFAULT 0,
        "sample_value" text NOT NULL,
        "occurrences" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_356251d4b7823bd160841027f7f" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "extraction_outcomes" (
        "id" uuid NOT NULL,
        "source" varchar(16) NOT NULL,
        "confidence" varchar(16) NOT NULL,
        "corrected_fields" integer NOT NULL,
        "issuer_name" varchar(200),
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_c505814e0b3447cfabcc0bca5cf" PRIMARY KEY ("id")
      )
    `);
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
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "read_at" timestamptz,
        "resolved_at" timestamptz,
        "email_sent_at" timestamptz,
        CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notification_event_retries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dedupe_key" varchar(512) NOT NULL,
        "event_name" varchar(80) NOT NULL,
        "payload" jsonb NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" timestamptz NOT NULL,
        "last_error" text,
        CONSTRAINT "PK_a4558738db0990980f82e8f245e" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_e8d7ee0636cd4bd206041bbcaa" ON "notification_event_retries" ("dedupe_key")');
    await queryRunner.query(`
      CREATE TABLE "tax_client_profiles" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "country_code" varchar(2) NOT NULL,
        "region_code" varchar(20),
        "entity_type" varchar(20) NOT NULL,
        "fiscal_year_start_month" smallint NOT NULL DEFAULT 1,
        "timezone" varchar(64) NOT NULL DEFAULT 'Europe/Madrid',
        "enabled" boolean NOT NULL DEFAULT true,
        "obligation_keys" jsonb NOT NULL DEFAULT '[]'::jsonb,
        CONSTRAINT "PK_621dd2118b226755febadaf6ead" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_a3b3ab775a89b93faee1d81c47" ON "tax_client_profiles" ("project_id")');
    await queryRunner.query(`
      CREATE TABLE "tax_compliance_settings" (
        "id" varchar(40) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "internal_lead_days" integer NOT NULL DEFAULT 7,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_688ff7ad97f55f7ace724b2d7c9" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tax_deadline_occurrences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "occurrence_key" varchar(240) NOT NULL,
        "project_id" uuid NOT NULL,
        "obligation_key" varchar(80) NOT NULL,
        "code" varchar(20) NOT NULL,
        "title" varchar(180) NOT NULL,
        "description" text NOT NULL,
        "category" varchar(30) NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "due_date" date NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "source_url" varchar(500) NOT NULL,
        "source_version" varchar(40) NOT NULL,
        CONSTRAINT "PK_96faeaa36b81fc653f769012edb" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_2316d4640156bba9d2a2986313" ON "tax_deadline_occurrences" ("occurrence_key")');
    await queryRunner.query(`
      CREATE TABLE "tax_source_states" (
        "source_key" varchar(80) NOT NULL,
        "country_code" varchar(2) NOT NULL,
        "label" varchar(160) NOT NULL,
        "format" varchar(16) NOT NULL,
        "source_url" varchar(500) NOT NULL,
        "feed_url" varchar(500) NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'never_checked',
        "accepted_hash" varchar(64),
        "accepted_events" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "observed_hash" varchar(64),
        "observed_events" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "last_checked_at" timestamptz,
        "last_successful_at" timestamptz,
        "last_source_modified_at" timestamptz,
        "etag" varchar(500),
        "last_modified" varchar(120),
        "last_error" text,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_ca9d4f5a543e046c8bddabf38ee" PRIMARY KEY ("source_key")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tax_source_states"');
    await queryRunner.query('DROP TABLE "tax_deadline_occurrences"');
    await queryRunner.query('DROP TABLE "tax_compliance_settings"');
    await queryRunner.query('DROP TABLE "tax_client_profiles"');
    await queryRunner.query('DROP TABLE "notification_event_retries"');
    await queryRunner.query('DROP TABLE "notifications"');
    await queryRunner.query('DROP TABLE "extraction_outcomes"');
    await queryRunner.query('DROP TABLE "invoice_extraction_hints"');
    await queryRunner.query('DROP TABLE "schedule_event_staff"');
    await queryRunner.query('DROP TABLE "schedule_event_products"');
    await queryRunner.query('DROP TABLE "schedule_event_days"');
    await queryRunner.query('DROP TABLE "schedule_events"');
    await queryRunner.query('DROP TABLE "staff_documents"');
    await queryRunner.query('DROP TABLE "project_products"');
    await queryRunner.query('DROP TABLE "invoice_lines"');
    await queryRunner.query('DROP TABLE "invoices"');
    await queryRunner.query('DROP TABLE "documents"');
    await queryRunner.query('DROP TABLE "projects"');
    await queryRunner.query('DROP TABLE "products"');
    await queryRunner.query('DROP TABLE "staff_document_types"');
    await queryRunner.query('DROP TABLE "staff_members"');
    await queryRunner.query('DROP TABLE "suppliers"');
    await queryRunner.query('DROP TABLE "security_audit_logs"');
    await queryRunner.query('DROP TABLE "workspace_members"');
    await queryRunner.query('DROP TABLE "companies"');
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
