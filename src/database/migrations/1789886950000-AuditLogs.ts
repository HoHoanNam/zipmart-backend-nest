import type { MigrationInterface, QueryRunner } from 'typeorm';

/** B.3 — audit log for `@Audit(...)`-tagged admin mutation handlers. */
export class AuditLogs1789886950000 implements MigrationInterface {
  name = 'AuditLogs1789886950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" varchar,
        "method" varchar NOT NULL,
        "path" varchar NOT NULL,
        "status_code" integer NOT NULL,
        "request_body" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_entity_type" ON "audit_logs" ("entity_type");`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs";`);
  }
}
