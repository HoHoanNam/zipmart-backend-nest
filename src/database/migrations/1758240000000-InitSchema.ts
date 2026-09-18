import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1758240000000 implements MigrationInterface {
  name = 'InitSchema1758240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('customer', 'admin');`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "category_id" uuid,
        "price" numeric(10,2) NOT NULL,
        "stock" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE TYPE "orders_status_enum" AS ENUM ('pending', 'paid', 'shipped');`);
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "status" "orders_status_enum" NOT NULL DEFAULT 'pending',
        "total" numeric(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id"),
        "quantity" int NOT NULL,
        "unit_price" numeric(10,2) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id"),
        "quantity" int NOT NULL,
        "added_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_cart_items_user_product" UNIQUE ("user_id", "product_id")
      );
    `);

    await queryRunner.query(
      `CREATE TYPE "behavior_events_event_type_enum" AS ENUM ('view', 'click', 'add_to_cart', 'purchase');`,
    );
    await queryRunner.query(`
      CREATE TABLE "behavior_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id"),
        "event_type" "behavior_events_event_type_enum" NOT NULL,
        "event_weight" float NOT NULL,
        "occurred_at" timestamptz NOT NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_behavior_events_user_product_time" ON "behavior_events" ("user_id", "product_id", "occurred_at");`,
    );

    // "recommendations" table is intentionally NOT created here — it is owned
    // and migrated by zipmart-backend-spring via Flyway (see IMPLEMENTATION_PLAN.md §6).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "behavior_events";`);
    await queryRunner.query(`DROP TYPE "behavior_events_event_type_enum";`);
    await queryRunner.query(`DROP TABLE "cart_items";`);
    await queryRunner.query(`DROP TABLE "order_items";`);
    await queryRunner.query(`DROP TABLE "orders";`);
    await queryRunner.query(`DROP TYPE "orders_status_enum";`);
    await queryRunner.query(`DROP TABLE "products";`);
    await queryRunner.query(`DROP TABLE "users";`);
    await queryRunner.query(`DROP TYPE "users_role_enum";`);
  }
}
