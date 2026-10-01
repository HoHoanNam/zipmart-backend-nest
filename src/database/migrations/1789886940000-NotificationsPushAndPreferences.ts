import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A.8 — Web Push subscriptions, per-user notification preferences, and the email-digest tracking column on `notifications`. */
export class NotificationsPushAndPreferences1789886940000 implements MigrationInterface {
  name = 'NotificationsPushAndPreferences1789886940000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "digest_sent_at" timestamptz;`);

    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "endpoint" varchar NOT NULL UNIQUE,
        "p256dh" varchar NOT NULL,
        "auth" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_push_subscriptions_user_id" ON "push_subscriptions" ("user_id");`);

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "email_digest_enabled" boolean NOT NULL DEFAULT true,
        "push_enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_preferences";`);
    await queryRunner.query(`DROP TABLE "push_subscriptions";`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "digest_sent_at";`);
  }
}
