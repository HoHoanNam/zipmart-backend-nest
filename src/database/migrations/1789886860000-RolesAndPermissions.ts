import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Additive RBAC foundation — does not touch the existing `users.role` enum
 * column or any `@Roles(UserRole.ADMIN)` guard. `role_id` is nullable and
 * only backfilled for bookkeeping; every existing controller keeps working
 * unchanged until each is individually migrated to `@RequirePermission(...)`.
 */
export class RolesAndPermissions1789886860000 implements MigrationInterface {
  name = 'RolesAndPermissions1789886860000';

  private readonly permissionKeys: Array<[string, string]> = [
    ['products.write', 'Tạo/sửa/xoá sản phẩm'],
    ['categories.write', 'Tạo/sửa/xoá danh mục'],
    ['coupons.write', 'Tạo/sửa/xoá mã giảm giá'],
    ['notifications.write', 'Gửi thông báo broadcast'],
    ['orders.write', 'Đổi trạng thái đơn hàng'],
    ['reviews.write', 'Duyệt/ẩn đánh giá'],
    ['analytics.read', 'Xem báo cáo & phân tích'],
    ['banners.write', 'Tạo/sửa/xoá banner'],
    ['uploads.write', 'Tải ảnh lên'],
    ['users.write', 'Đổi vai trò người dùng'],
    ['roles.manage', 'Quản lý vai trò & phân quyền'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL UNIQUE,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" varchar NOT NULL UNIQUE,
        "description" varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
        "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("role_id", "permission_id")
      );
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role_id" uuid REFERENCES "roles"("id");`);

    for (const [key, description] of this.permissionKeys) {
      await queryRunner.query(`INSERT INTO "permissions" ("key", "description") VALUES ($1, $2);`, [
        key,
        description,
      ]);
    }

    await queryRunner.query(
      `INSERT INTO "roles" ("name", "is_system") VALUES ('Super Admin', true), ('Customer', true);`,
    );
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT (SELECT "id" FROM "roles" WHERE "name" = 'Super Admin'), "id" FROM "permissions";
    `);

    await queryRunner.query(`
      UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'Super Admin') WHERE "role" = 'admin';
    `);
    await queryRunner.query(`
      UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'Customer') WHERE "role" = 'customer';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id";`);
    await queryRunner.query(`DROP TABLE "role_permissions";`);
    await queryRunner.query(`DROP TABLE "permissions";`);
    await queryRunner.query(`DROP TABLE "roles";`);
  }
}
