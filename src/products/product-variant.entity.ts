import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'varchar', nullable: true })
  size!: string | null;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', unique: true })
  sku!: string;

  /** Null falls back to the parent product's price — most variants share one price. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
