import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `simple` text-search config (not `english`) — no stemming/stopwords for
 * either language is available out of the box for Vietnamese, and `simple`
 * (plain tokenization, no stemming) is a safer no-op default than picking
 * `english` and getting subtly wrong behavior on Vietnamese text.
 */
export class ProductSearchVector1789886820000 implements MigrationInterface {
  name = 'ProductSearchVector1789886820000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN "search_vector" tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C')
      ) STORED;
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_products_search_vector" ON "products" USING GIN ("search_vector");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_products_search_vector";`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "search_vector";`);
  }
}
