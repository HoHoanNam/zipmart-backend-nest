import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Banners1789886750000 implements MigrationInterface {
  name = 'Banners1789886750000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "banners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "image_url" varchar NOT NULL,
        "headline" varchar NOT NULL,
        "subtext" varchar,
        "cta_label" varchar,
        "cta_link" varchar,
        "sort_order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "banners";`);
  }
}
