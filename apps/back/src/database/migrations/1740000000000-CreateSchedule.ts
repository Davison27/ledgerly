import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedule1740000000000 implements MigrationInterface {
  name = 'CreateSchedule1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "schedule_events" (
        "id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "title" varchar(120),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedule_events_project" FOREIGN KEY ("project_id")
          REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_events_project_id" ON "schedule_events" ("project_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "schedule_event_days" (
        "id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "date" date NOT NULL,
        "start_time" time,
        "end_time" time,
        CONSTRAINT "PK_schedule_event_days" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_schedule_event_days_event_date" UNIQUE ("event_id", "date"),
        CONSTRAINT "CHK_schedule_event_days_time_pair" CHECK (("start_time" IS NULL) = ("end_time" IS NULL)),
        CONSTRAINT "CHK_schedule_event_days_time_order" CHECK ("end_time" IS NULL OR "end_time" > "start_time"),
        CONSTRAINT "FK_schedule_event_days_event" FOREIGN KEY ("event_id")
          REFERENCES "schedule_events" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_event_days_date" ON "schedule_event_days" ("date")`,
    );

    await queryRunner.query(`
      CREATE TABLE "schedule_event_staff" (
        "event_id" uuid NOT NULL,
        "staff_member_id" uuid NOT NULL,
        CONSTRAINT "PK_schedule_event_staff" PRIMARY KEY ("event_id", "staff_member_id"),
        CONSTRAINT "FK_schedule_event_staff_event" FOREIGN KEY ("event_id")
          REFERENCES "schedule_events" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_schedule_event_staff_staff_member" FOREIGN KEY ("staff_member_id")
          REFERENCES "staff_members" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_event_staff_staff_member_id" ON "schedule_event_staff" ("staff_member_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "schedule_event_products" (
        "event_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        CONSTRAINT "PK_schedule_event_products" PRIMARY KEY ("event_id", "product_id"),
        CONSTRAINT "CHK_schedule_event_products_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "FK_schedule_event_products_event" FOREIGN KEY ("event_id")
          REFERENCES "schedule_events" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_schedule_event_products_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "schedule_event_products"`);
    await queryRunner.query(`DROP TABLE "schedule_event_staff"`);
    await queryRunner.query(`DROP TABLE "schedule_event_days"`);
    await queryRunner.query(`DROP TABLE "schedule_events"`);
  }
}
