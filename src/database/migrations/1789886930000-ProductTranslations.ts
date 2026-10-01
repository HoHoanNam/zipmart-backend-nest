import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A.10 — English name/description for i18n on zipmart-frontend-web. */
export class ProductTranslations1789886930000 implements MigrationInterface {
  name = 'ProductTranslations1789886930000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "name_en" varchar;`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "description_en" text;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "description_en";`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "name_en";`);
  }
}
