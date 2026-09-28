import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewModeration1789886800000 implements MigrationInterface {
  name = 'ReviewModeration1789886800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD COLUMN "hidden" boolean NOT NULL DEFAULT false;`,
    );
    await queryRunner.query(`ALTER TABLE "reviews" ADD COLUMN "admin_reply" text;`);
    await queryRunner.query(`ALTER TABLE "reviews" ADD COLUMN "admin_reply_at" timestamptz;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "admin_reply_at";`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "admin_reply";`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "hidden";`);
  }
}
