import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Inventory1789886850000 implements MigrationInterface {
  name = 'Inventory1789886850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer;`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "change" integer NOT NULL,
        "reason" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_stock_movements_product_id" ON "stock_movements" ("product_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_movements";`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "low_stock_threshold";`);
  }
}
