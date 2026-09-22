import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Reviews1789886720000 implements MigrationInterface {
  name = 'Reviews1789886720000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "author_name" varchar NOT NULL,
        "author_avatar_url" varchar,
        "rating" smallint NOT NULL,
        "comment" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_reviews_user_product" UNIQUE ("user_id", "product_id"),
        CONSTRAINT "ck_reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5)
      );
      CREATE INDEX "idx_reviews_product_id" ON "reviews" ("product_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reviews";`);
  }
}
