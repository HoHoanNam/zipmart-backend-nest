import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderCheckoutExpansion1789886700000 implements MigrationInterface {
  name = 'OrderCheckoutExpansion1789886700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safe inside this migration's transaction on Postgres 12+ (17 here) —
    // the new values are never used for a comparison/INSERT in this same
    // migration.
    await queryRunner.query(`ALTER TYPE "orders_status_enum" ADD VALUE 'completed';`);
    await queryRunner.query(`ALTER TYPE "orders_status_enum" ADD VALUE 'cancelled';`);

    await queryRunner.query(`CREATE TYPE "orders_payment_method_enum" AS ENUM ('cod', 'credit');`);

    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "phone_number" varchar;`);

    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "recipient_name" varchar,
        ADD COLUMN "phone_number" varchar,
        ADD COLUMN "city" varchar,
        ADD COLUMN "district" varchar,
        ADD COLUMN "ward" varchar,
        ADD COLUMN "street_address" varchar,
        ADD COLUMN "payment_method" "orders_payment_method_enum" NOT NULL DEFAULT 'cod',
        ADD COLUMN "tax_amount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN "discount_amount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN "coupon_code" varchar;
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
        ADD COLUMN "product_name" varchar,
        ADD COLUMN "product_image_url" varchar;
    `);

    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL UNIQUE,
        "discount_percent" numeric(5,2) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "coupons" ("code", "discount_percent", "active") VALUES
        ('WELCOME10', 10.00, true),
        ('SALE20', 20.00, true),
        ('VIP30', 30.00, false);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "coupons";`);

    await queryRunner.query(`
      ALTER TABLE "order_items"
        DROP COLUMN "product_image_url",
        DROP COLUMN "product_name";
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN "coupon_code",
        DROP COLUMN "discount_amount",
        DROP COLUMN "tax_amount",
        DROP COLUMN "payment_method",
        DROP COLUMN "street_address",
        DROP COLUMN "ward",
        DROP COLUMN "district",
        DROP COLUMN "city",
        DROP COLUMN "phone_number",
        DROP COLUMN "recipient_name";
    `);

    await queryRunner.query(`DROP TYPE "orders_payment_method_enum";`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone_number";`);

    // Postgres has no `ALTER TYPE ... DROP VALUE` — 'completed'/'cancelled'
    // cannot be cleanly removed from orders_status_enum without recreating
    // the type. Left as-is, matching this repo's existing lack of a
    // precedent for reverting an enum ADD VALUE.
  }
}
