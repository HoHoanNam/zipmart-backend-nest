import type { MigrationInterface, QueryRunner } from 'typeorm';

/** B.10 — bulk product import (`sku` match/update key + `bulk_import_jobs`) and scheduled reports. */
export class BulkImportAndScheduledReports1789886990000 implements MigrationInterface {
  name = 'BulkImportAndScheduledReports1789886990000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "sku" varchar UNIQUE;`);

    await queryRunner.query(
      `CREATE TYPE "bulk_import_jobs_status_enum" AS ENUM ('validated', 'committed');`,
    );
    await queryRunner.query(`
      CREATE TABLE "bulk_import_jobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "status" "bulk_import_jobs_status_enum" NOT NULL DEFAULT 'validated',
        "total_rows" integer NOT NULL,
        "valid_row_count" integer NOT NULL,
        "error_row_count" integer NOT NULL,
        "errors" jsonb,
        "valid_rows" jsonb NOT NULL,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE TYPE "scheduled_reports_report_type_enum" AS ENUM ('revenue', 'top_products', 'orders_csv');`,
    );
    await queryRunner.query(`
      CREATE TABLE "scheduled_reports" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "report_type" "scheduled_reports_report_type_enum" NOT NULL,
        "cron_expression" varchar NOT NULL,
        "recipient_emails" jsonb NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "last_run_at" timestamptz,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scheduled_reports";`);
    await queryRunner.query(`DROP TYPE "scheduled_reports_report_type_enum";`);
    await queryRunner.query(`DROP TABLE "bulk_import_jobs";`);
    await queryRunner.query(`DROP TYPE "bulk_import_jobs_status_enum";`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku";`);
  }
}
