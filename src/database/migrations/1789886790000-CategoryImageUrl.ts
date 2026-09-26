import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryImageUrl1789886790000 implements MigrationInterface {
  name = 'CategoryImageUrl1789886790000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN "image_url" varchar;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "image_url";`);
  }
}
