import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data-only backfill — normalizes existing brand values (e.g. "WHOAU ",
 * "Ray-Ban") to uppercase, matching the new @Transform on CreateProductDto
 * so all products dedupe correctly in GET /products/brands regardless of
 * how the brand was originally typed.
 */
export class NormalizeBrandCasing1789886780000 implements MigrationInterface {
  name = 'NormalizeBrandCasing1789886780000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "products" SET "brand" = UPPER(TRIM("brand")) WHERE "brand" IS NOT NULL;`,
    );
  }

  public async down(): Promise<void> {
    // Original casing is not recoverable — this migration is a one-way
    // data normalization, not a schema change. Same documented-limitation
    // pattern as the enum ADD VALUE case in InitSchema's down().
  }
}
