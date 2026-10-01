import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Infra D — payment gateway foundation (VNPay/Momo). `orders.payment_status`
 * is deliberately separate from the existing `orders_status_enum` lifecycle
 * column (see `OrderPaymentStatus` doc comment in `order.entity.ts`).
 */
export class Payments1789886870000 implements MigrationInterface {
  name = 'Payments1789886870000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "orders_payment_method_enum" ADD VALUE 'vnpay';`);
    await queryRunner.query(`ALTER TYPE "orders_payment_method_enum" ADD VALUE 'momo';`);

    await queryRunner.query(
      `CREATE TYPE "orders_payment_status_enum" AS ENUM ('unpaid', 'paid', 'refunded');`,
    );
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "payment_status" "orders_payment_status_enum" NOT NULL DEFAULT 'unpaid';
    `);

    await queryRunner.query(`CREATE TYPE "payments_gateway_enum" AS ENUM ('vnpay', 'momo');`);
    await queryRunner.query(
      `CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');`,
    );
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "gateway" "payments_gateway_enum" NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "gateway_transaction_id" varchar,
        "raw_response" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_order_id" ON "payments" ("order_id");`);

    // Orders placed before this migration are COD-only in practice, so
    // backfilling their `payment_status` from the existing lifecycle status
    // is a reasonable approximation rather than leaving them all `unpaid`.
    await queryRunner.query(`
      UPDATE "orders" SET "payment_status" = 'paid' WHERE "status" IN ('paid', 'shipped', 'completed');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments";`);
    await queryRunner.query(`DROP TYPE "payments_status_enum";`);
    await queryRunner.query(`DROP TYPE "payments_gateway_enum";`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "payment_status";`);
    await queryRunner.query(`DROP TYPE "orders_payment_status_enum";`);
    // Postgres has no `ALTER TYPE ... DROP VALUE` — 'vnpay'/'momo' stay in
    // `orders_payment_method_enum` on rollback (harmless, matches how
    // `ProductSearchVector`'s GIN index etc. handle non-reversible bits).
  }
}
