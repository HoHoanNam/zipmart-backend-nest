import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WishlistItems1789886710000 implements MigrationInterface {
  name = 'WishlistItems1789886710000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wishlist_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id"),
        "added_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_wishlist_items_user_product" UNIQUE ("user_id", "product_id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wishlist_items";`);
  }
}
