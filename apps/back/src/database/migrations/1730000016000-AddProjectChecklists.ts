import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectChecklists1730000016000 implements MigrationInterface {
  name = 'AddProjectChecklists1730000016000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN "planning_enabled" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      CREATE TABLE "project_checklist_templates" (
        "id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        CONSTRAINT "PK_project_checklist_templates" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_project_checklist_templates_name" CHECK (char_length(btrim("name")) > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "project_checklist_template_items" (
        "id" uuid NOT NULL,
        "template_id" uuid NOT NULL,
        "text" varchar(500) NOT NULL,
        "position" integer NOT NULL,
        CONSTRAINT "PK_project_checklist_template_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_project_checklist_template_items_text" CHECK (char_length(btrim("text")) > 0),
        CONSTRAINT "CHK_project_checklist_template_items_position" CHECK ("position" >= 0),
        CONSTRAINT "UQ_project_checklist_template_items_position" UNIQUE ("template_id", "position"),
        CONSTRAINT "FK_project_checklist_template_items_template" FOREIGN KEY ("template_id") REFERENCES "project_checklist_templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "project_checklists" (
        "project_id" uuid NOT NULL,
        "source_template_id" uuid,
        "name" varchar(160) NOT NULL,
        CONSTRAINT "PK_project_checklists" PRIMARY KEY ("project_id"),
        CONSTRAINT "CHK_project_checklists_name" CHECK (char_length(btrim("name")) > 0),
        CONSTRAINT "FK_project_checklists_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_checklists_source_template" FOREIGN KEY ("source_template_id") REFERENCES "project_checklist_templates"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_project_checklists_source_template_id" ON "project_checklists" ("source_template_id")');
    await queryRunner.query(`
      CREATE TABLE "project_checklist_items" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "text" varchar(500) NOT NULL,
        "position" integer NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_project_checklist_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_project_checklist_items_text" CHECK (char_length(btrim("text")) > 0),
        CONSTRAINT "CHK_project_checklist_items_position" CHECK ("position" >= 0),
        CONSTRAINT "UQ_project_checklist_items_position" UNIQUE ("project_id", "position"),
        CONSTRAINT "FK_project_checklist_items_checklist" FOREIGN KEY ("project_id") REFERENCES "project_checklists"("project_id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "project_checklist_items"');
    await queryRunner.query('DROP INDEX "IDX_project_checklists_source_template_id"');
    await queryRunner.query('DROP TABLE "project_checklists"');
    await queryRunner.query('DROP TABLE "project_checklist_template_items"');
    await queryRunner.query('DROP TABLE "project_checklist_templates"');
    await queryRunner.query('ALTER TABLE "projects" DROP COLUMN "planning_enabled"');
  }
}
