import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A.6 — loyalty points. `order_id` on `loyalty_transactions` is nullable (not a strict FK requirement) to leave room for a future non-order-driven adjustment (e.g. manual admin grant), even though today every row is order-driven. */
export class Loyalty1789886920000 implements MigrationInterface {
  name = 'Loyalty1789886920000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "loyalty_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "points_balance" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE TYPE "loyalty_transactions_type_enum" AS ENUM ('earn', 'redeem');`);
    await queryRunner.query(`
      CREATE TABLE "loyalty_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
        "type" "loyalty_transactions_type_enum" NOT NULL,
        "points" integer NOT NULL,
        "balance_after" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_loyalty_transactions_user_id" ON "loyalty_transactions" ("user_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "loyalty_transactions";`);
    await queryRunner.query(`DROP TYPE "loyalty_transactions_type_enum";`);
    await queryRunner.query(`DROP TABLE "loyalty_accounts";`);
  }
}
