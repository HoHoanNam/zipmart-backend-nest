import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Infra E — return/refund requests. Depends on Infra D (`payments` table exists). */
export class Returns1789886880000 implements MigrationInterface {
  name = 'Returns1789886880000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "return_requests_reason_enum" AS ENUM
        ('defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other');
    `);
    await queryRunner.query(`
      CREATE TYPE "return_requests_status_enum" AS ENUM
        ('requested', 'approved', 'rejected', 'refunded', 'completed');
    `);
    await queryRunner.query(`
      CREATE TABLE "return_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "order_item_id" uuid NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
        "reason" "return_requests_reason_enum" NOT NULL,
        "note" text,
        "status" "return_requests_status_enum" NOT NULL DEFAULT 'requested',
        "refund_amount" numeric(10,2),
        "refund_payment_id" uuid REFERENCES "payments"("id") ON DELETE SET NULL,
        "resolved_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_return_requests_user_id" ON "return_requests" ("user_id");`);
    await queryRunner.query(`CREATE INDEX "idx_return_requests_order_id" ON "return_requests" ("order_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "return_requests";`);
    await queryRunner.query(`DROP TYPE "return_requests_status_enum";`);
    await queryRunner.query(`DROP TYPE "return_requests_reason_enum";`);
  }
}
