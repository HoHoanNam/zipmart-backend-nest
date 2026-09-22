import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAvatarUrl1789886730000 implements MigrationInterface {
  name = 'UserAvatarUrl1789886730000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_url" varchar;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url";`);
  }
}
