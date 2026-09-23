import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductOriginalPrice1789886740000 implements MigrationInterface {
  name = 'ProductOriginalPrice1789886740000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "original_price" numeric(10,2);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "original_price";`);
  }
}
