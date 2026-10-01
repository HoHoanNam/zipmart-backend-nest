import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Key-value config, seeded not admin-creatable (`PATCH /settings/:key`
 * updates an existing row, never inserts a new key) — same "seeded set,
 * editable values" shape as `Permission`. `key` is the primary key itself
 * (no synthetic uuid) since every lookup/update is by name, never by id.
 * `value` is jsonb so a single table covers numbers (`vat_rate`), and
 * booleans (`payment_gateway_enabled`) without per-type columns.
 *
 * `payment_gateway_enabled` stores only a boolean toggle — never a secret.
 * VNPay/Momo credentials stay in env vars exclusively; this key just lets
 * an admin turn the storefront's gateway checkout option on/off without a
 * deploy, independent of whether real credentials are configured.
 */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar' })
  key!: string;

  @Column({ type: 'jsonb' })
  value!: unknown;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
