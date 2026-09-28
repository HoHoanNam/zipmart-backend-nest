import type { MigrationInterface, QueryRunner } from 'typeorm';

/** All new `coupons` columns are nullable/default-safe so every existing coupon keeps behaving exactly as before (no expiry, no usage cap, no minimum order, no per-user cap). */
export class EnhancedCoupons1789886840000 implements MigrationInterface {
  name = 'EnhancedCoupons1789886840000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "coupons" ADD COLUMN "expires_at" timestamptz;`);
    await queryRunner.query(`ALTER TABLE "coupons" ADD COLUMN "usage_limit" integer;`);
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD COLUMN "used_count" integer NOT NULL DEFAULT 0;`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupons" ADD COLUMN "min_order_amount" numeric(10,2);`,
    );
    await queryRunner.query(`ALTER TABLE "coupons" ADD COLUMN "per_user_limit" integer;`);

    await queryRunner.query(`
      CREATE TABLE "coupon_usages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "coupon_id" uuid NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "used_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_coupon_usages_coupon_user" ON "coupon_usages" ("coupon_id", "user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "coupon_usages";`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "per_user_limit";`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "min_order_amount";`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "used_count";`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "usage_limit";`);
    await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "expires_at";`);
  }
}
