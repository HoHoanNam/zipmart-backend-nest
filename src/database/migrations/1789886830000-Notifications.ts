import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Notifications1789886830000 implements MigrationInterface {
  name = 'Notifications1789886830000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "title" varchar NOT NULL,
        "body" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "related_entity_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications";`);
  }
}
