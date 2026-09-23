import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariants1789886770000 implements MigrationInterface {
  name = 'ProductVariants1789886770000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "size" varchar,
        "color" varchar,
        "sku" varchar NOT NULL UNIQUE,
        "price" numeric(10,2),
        "stock" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_product_variants_product_id" ON "product_variants" ("product_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items" ADD COLUMN "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE CASCADE;
    `);
    // Replace the old (user_id, product_id) unique index with one that also
    // distinguishes by variant — COALESCE'd to a sentinel UUID because
    // Postgres treats every NULL as distinct in a plain unique index, which
    // would otherwise let a user accumulate duplicate cart rows for the same
    // non-variant product (variant_id IS NULL on all of them).
    // Originally created as a table CONSTRAINT (not a bare index), so it
    // needs DROP CONSTRAINT, not DROP INDEX — Postgres refuses the latter
    // for a constraint-backed index.
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "uq_cart_items_user_product";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_cart_items_user_product_variant" ON "cart_items"
        ("user_id", "product_id", (COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::uuid)));
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
        ADD COLUMN "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE SET NULL,
        ADD COLUMN "variant_label" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
        DROP COLUMN "variant_label",
        DROP COLUMN "variant_id";
    `);

    await queryRunner.query(`DROP INDEX "uq_cart_items_user_product_variant";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_cart_items_user_product" ON "cart_items" ("user_id", "product_id");
    `);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN "variant_id";`);

    await queryRunner.query(`DROP TABLE "product_variants";`);
  }
}
