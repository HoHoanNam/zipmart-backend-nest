import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductCatalogExpansion1789886691620 implements MigrationInterface {
  name = 'ProductCatalogExpansion1789886691620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "categories" ("name", "slug") VALUES
        ('Thiết bị điện tử', 'electronics'),
        ('Quần áo & Giày dép', 'apparel'),
        ('Đồ gia dụng', 'household'),
        ('Thực phẩm đóng gói', 'food');
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "brand" varchar,
        ADD COLUMN "description" text,
        ADD COLUMN "images" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN "weight_grams" int,
        ADD COLUMN "attributes" jsonb NOT NULL DEFAULT '{}';
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id")
        REFERENCES "categories"("id") ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "fk_products_category";`);
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN "attributes",
        DROP COLUMN "weight_grams",
        DROP COLUMN "images",
        DROP COLUMN "description",
        DROP COLUMN "brand";
    `);
    await queryRunner.query(`DROP TABLE "categories";`);
  }
}
