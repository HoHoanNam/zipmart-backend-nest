import type { MigrationInterface, QueryRunner } from 'typeorm';

/** B.8 — CMS pages with immutable version snapshots. `cms_pages.current_version_id` is a plain uuid column (not a FK) added after the versions table exists, since the two tables reference each other (page → current version, version → page) and Postgres can't create both FKs in one pass without one side being nullable+deferred; simpler to just not enforce it at the DB level — `CmsService` is the only writer of either table. */
export class Cms1789886980000 implements MigrationInterface {
  name = 'Cms1789886980000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "cms_pages_status_enum" AS ENUM ('draft', 'published');`);
    await queryRunner.query(`
      CREATE TABLE "cms_pages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "slug" varchar NOT NULL UNIQUE,
        "status" "cms_pages_status_enum" NOT NULL DEFAULT 'draft',
        "current_version_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "cms_page_versions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "page_id" uuid NOT NULL REFERENCES "cms_pages"("id") ON DELETE CASCADE,
        "title" varchar NOT NULL,
        "content" text NOT NULL,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_cms_page_versions_page_id" ON "cms_page_versions" ("page_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cms_page_versions";`);
    await queryRunner.query(`DROP TABLE "cms_pages";`);
    await queryRunner.query(`DROP TYPE "cms_pages_status_enum";`);
  }
}
