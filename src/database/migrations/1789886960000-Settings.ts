import type { MigrationInterface, QueryRunner } from 'typeorm';

/** B.4 — key-value settings, seeded with the 3 keys the plan calls out. `vat_rate` replaces the hardcoded constant `orders.service.ts` used before (see `orders.constants.ts`). */
export class Settings1789886960000 implements MigrationInterface {
  name = 'Settings1789886960000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "settings" (
        "key" varchar PRIMARY KEY,
        "value" jsonb NOT NULL,
        "description" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "settings" ("key", "value", "description") VALUES
        ('shipping_fee', '0', 'Phí vận chuyển cố định (đ) — 0 nghĩa là miễn phí vận chuyển, chưa được trừ vào checkout hiện tại'),
        ('vat_rate', '0.08', 'Thuế VAT áp dụng trên (subtotal - discount) khi checkout — thay hằng số cứng trước đây'),
        ('payment_gateway_enabled', 'false', 'Cho phép khách hàng chọn VNPay/Momo khi checkout — không lưu secret, chỉ là cờ bật/tắt');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "settings";`);
  }
}
