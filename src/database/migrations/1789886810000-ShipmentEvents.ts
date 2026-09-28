import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ShipmentEvents1789886810000 implements MigrationInterface {
  name = 'ShipmentEvents1789886810000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "shipment_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "status" varchar NOT NULL,
        "note" text,
        "occurred_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_shipment_events_order_id" ON "shipment_events" ("order_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shipment_events";`);
  }
}
