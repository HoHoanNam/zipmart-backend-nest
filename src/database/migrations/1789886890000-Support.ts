import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Infra H — support/chat conversations & messages. Depends on Infra B (realtime gateway) only at the application layer, no schema dependency. */
export class Support1789886890000 implements MigrationInterface {
  name = 'Support1789886890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "support_conversations_status_enum" AS ENUM ('open', 'closed');`);
    await queryRunner.query(`
      CREATE TABLE "support_conversations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" "support_conversations_status_enum" NOT NULL DEFAULT 'open',
        "assigned_admin_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_message_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_support_conversations_user_id" ON "support_conversations" ("user_id");`,
    );
    await queryRunner.query(`
      CREATE TABLE "support_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL REFERENCES "support_conversations"("id") ON DELETE CASCADE,
        "sender_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "from_admin" boolean NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_support_messages_conversation_id" ON "support_messages" ("conversation_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "support_messages";`);
    await queryRunner.query(`DROP TABLE "support_conversations";`);
    await queryRunner.query(`DROP TYPE "support_conversations_status_enum";`);
  }
}
