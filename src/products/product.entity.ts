import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
