import type { MigrationInterface, QueryRunner } from 'typeorm';

/** A.4 — Google/Facebook social login. */
export class OAuthAccounts1789886910000 implements MigrationInterface {
  name = 'OAuthAccounts1789886910000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "oauth_accounts_provider_enum" AS ENUM ('google', 'facebook');`);
    await queryRunner.query(`
      CREATE TABLE "oauth_accounts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider" "oauth_accounts_provider_enum" NOT NULL,
        "provider_user_id" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("provider", "provider_user_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX "idx_oauth_accounts_user_id" ON "oauth_accounts" ("user_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oauth_accounts";`);
    await queryRunner.query(`DROP TYPE "oauth_accounts_provider_enum";`);
  }
}
