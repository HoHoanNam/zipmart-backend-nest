import type { MigrationInterface, QueryRunner } from 'typeorm';

/** B.7 — suppliers & purchase orders. `receive()` reuses the existing `stock_movements` table (no new ledger table). */
export class Suppliers1789886970000 implements MigrationInterface {
  name = 'Suppliers1789886970000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "contact_name" varchar,
        "phone_number" varchar,
        "email" varchar,
        "address" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE TYPE "purchase_orders_status_enum" AS ENUM ('pending', 'received', 'cancelled');`,
    );
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        "status" "purchase_orders_status_enum" NOT NULL DEFAULT 'pending',
        "note" text,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "received_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_orders_supplier_id" ON "purchase_orders" ("supplier_id");`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "purchase_order_id" uuid NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "quantity" integer NOT NULL,
        "unit_cost" numeric(10,2) NOT NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_purchase_order_items_purchase_order_id" ON "purchase_order_items" ("purchase_order_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "purchase_order_items";`);
    await queryRunner.query(`DROP TABLE "purchase_orders";`);
    await queryRunner.query(`DROP TYPE "purchase_orders_status_enum";`);
    await queryRunner.query(`DROP TABLE "suppliers";`);
  }
}
