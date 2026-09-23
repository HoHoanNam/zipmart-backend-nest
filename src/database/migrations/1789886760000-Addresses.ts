import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Addresses1789886760000 implements MigrationInterface {
  name = 'Addresses1789886760000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "addresses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "recipient_name" varchar NOT NULL,
        "phone_number" varchar NOT NULL,
        "city" varchar NOT NULL,
        "district" varchar NOT NULL,
        "ward" varchar NOT NULL,
        "street_address" varchar NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "idx_addresses_user_id" ON "addresses" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "addresses";`);
  }
}
