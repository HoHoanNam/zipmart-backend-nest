import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  /** B.10 — bulk import match/update key. Nullable: every product created before this column existed (and any created outside the CSV import flow) has no SKU and is never touched by a re-import. */
  @Column({ type: 'varchar', unique: true, nullable: true })
  sku!: string | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** English translations for A.10 (frontend-web i18n) — null = no translation yet, frontend falls back to `name`/`description`. Admin-web's product form also edits these (still Vietnamese-only UI, just two extra fields). */
  @Column({ name: 'name_en', type: 'varchar', nullable: true })
  nameEn!: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn!: string | null;

  /** URLs only — no upload/storage infra. See IMPLEMENTATION_PLAN.md. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  images!: string[];

  @Column({ name: 'weight_grams', type: 'int', nullable: true })
  weightGrams!: number | null;

  /** Shape depends on the linked category — see src/products/attribute-schemas.ts. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  attributes!: Record<string, unknown>;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string;

  /** Pre-discount reference price — when set and greater than `price`, the frontend shows a strikethrough + "-X%" badge. */
  @Column({ name: 'original_price', type: 'numeric', precision: 10, scale: 2, nullable: true })
  originalPrice!: string | null;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** Null = use the platform default (10, same as the admin dashboard's low-stock alert used before this column existed). */
  @Column({ name: 'low_stock_threshold', type: 'int', nullable: true })
  lowStockThreshold!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
