import { MigrationInterface, QueryRunner } from 'typeorm';

const indexes = [
  { name: 'IDX_551c4a916936c52d0dc7966055', table: 'documents', column: 'supplier_id' },
  { name: 'IDX_bd2cb5e5922618cb98dd2ee706', table: 'documents', column: 'staff_member_id' },
  { name: 'IDX_908cca007dc1601ba360b27982', table: 'staff_documents', column: 'type_id' },
  { name: 'IDX_9c0f0154f25052628f0901ee95', table: 'project_equipment', column: 'equipment_id' },
  { name: 'IDX_3edf08887d417f800640857a79', table: 'schedule_events', column: 'project_id' },
  { name: 'IDX_961dfb433dc74b91e0bff066a6', table: 'schedule_event_days', column: 'event_id' },
  { name: 'IDX_14e80958c8e830968a46a8370c', table: 'schedule_event_equipment', column: 'equipment_id' },
  { name: 'IDX_2a2b9eedbeb10846af93f44398', table: 'schedule_event_staff', column: 'staff_member_id' },
  { name: 'IDX_4a9fc8bfdc30c3f4b88dc489e8', table: 'tax_deadline_occurrences', column: 'project_id' },
  { name: 'IDX_ae52fd562e234be33006f1f3bb', table: 'notifications', column: 'resource_project_id' },
] as const;

const foreignKeys = [
  {
    name: 'FK_documents_project',
    table: 'documents',
    column: 'project_id',
    referencedTable: 'projects',
    onDelete: 'RESTRICT',
  },
  {
    name: 'FK_documents_supplier',
    table: 'documents',
    column: 'supplier_id',
    referencedTable: 'suppliers',
    onDelete: 'RESTRICT',
  },
  {
    name: 'FK_documents_staff_member',
    table: 'documents',
    column: 'staff_member_id',
    referencedTable: 'staff_members',
    onDelete: 'RESTRICT',
  },
  {
    name: 'FK_staff_documents_staff_member',
    table: 'staff_documents',
    column: 'staff_member_id',
    referencedTable: 'staff_members',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_staff_documents_type',
    table: 'staff_documents',
    column: 'type_id',
    referencedTable: 'staff_document_types',
    onDelete: 'RESTRICT',
  },
  {
    name: 'FK_company_documents_type',
    table: 'company_documents',
    column: 'type_id',
    referencedTable: 'company_document_types',
    onDelete: 'RESTRICT',
  },
  {
    name: 'FK_project_equipment_project',
    table: 'project_equipment',
    column: 'project_id',
    referencedTable: 'projects',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_project_equipment_equipment',
    table: 'project_equipment',
    column: 'equipment_id',
    referencedTable: 'equipment',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_events_project',
    table: 'schedule_events',
    column: 'project_id',
    referencedTable: 'projects',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_event_days_event',
    table: 'schedule_event_days',
    column: 'event_id',
    referencedTable: 'schedule_events',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_event_equipment_event',
    table: 'schedule_event_equipment',
    column: 'event_id',
    referencedTable: 'schedule_events',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_event_equipment_equipment',
    table: 'schedule_event_equipment',
    column: 'equipment_id',
    referencedTable: 'equipment',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_event_staff_event',
    table: 'schedule_event_staff',
    column: 'event_id',
    referencedTable: 'schedule_events',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_schedule_event_staff_staff_member',
    table: 'schedule_event_staff',
    column: 'staff_member_id',
    referencedTable: 'staff_members',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_tax_client_profiles_project',
    table: 'tax_client_profiles',
    column: 'project_id',
    referencedTable: 'projects',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_tax_deadline_occurrences_project',
    table: 'tax_deadline_occurrences',
    column: 'project_id',
    referencedTable: 'projects',
    onDelete: 'CASCADE',
  },
  {
    name: 'FK_notifications_resource_project',
    table: 'notifications',
    column: 'resource_project_id',
    referencedTable: 'projects',
    onDelete: 'CASCADE',
  },
] as const;

export class AddReferentialIntegrity1730000005000 implements MigrationInterface {
  name = 'AddReferentialIntegrity1730000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "documents" ADD "created_at" timestamptz NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "documents" ADD "updated_at" timestamptz NOT NULL DEFAULT now()');
    await queryRunner.query('ALTER TABLE "documents" ADD "deleted_at" timestamptz');
    await queryRunner.query('ALTER TABLE "documents" ADD "created_by" uuid');
    await queryRunner.query('ALTER TABLE "documents" ADD "deleted_by" uuid');
    await queryRunner.query('ALTER TABLE "suppliers" ADD "archived_at" timestamptz');
    await queryRunner.query('ALTER TABLE "equipment" ADD "archived_at" timestamptz');
    await queryRunner.query('ALTER TABLE "staff_members" ADD "archived_at" timestamptz');

    for (const foreignKey of foreignKeys) {
      await queryRunner.query(
        `ALTER TABLE "${foreignKey.table}" ADD CONSTRAINT "${foreignKey.name}" FOREIGN KEY ("${foreignKey.column}") REFERENCES "${foreignKey.referencedTable}"("id") ON DELETE ${foreignKey.onDelete ?? 'RESTRICT'}`,
      );
    }

    for (const index of indexes) {
      await queryRunner.query(
        `CREATE INDEX "${index.name}" ON "${index.table}" ("${index.column}")`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [...indexes].reverse()) {
      await queryRunner.query(`DROP INDEX "${index.name}"`);
    }

    for (const foreignKey of [...foreignKeys].reverse()) {
      await queryRunner.query(`ALTER TABLE "${foreignKey.table}" DROP CONSTRAINT "${foreignKey.name}"`);
    }

    await queryRunner.query('ALTER TABLE "staff_members" DROP COLUMN "archived_at"');
    await queryRunner.query('ALTER TABLE "equipment" DROP COLUMN "archived_at"');
    await queryRunner.query('ALTER TABLE "suppliers" DROP COLUMN "archived_at"');
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "deleted_by"');
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "created_by"');
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "updated_at"');
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "created_at"');
  }
}
