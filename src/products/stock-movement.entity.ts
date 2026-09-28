import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Audit trail for manual admin stock adjustments only — checkout/cancel/restock stock changes go straight through `Product.stock`/`ProductVariant.stock` without a row here (this table exists for the `/inventory` admin screen, not as a general ledger of every stock change in the system). */
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  /** Positive = stock added, negative = stock removed. */
  @Column({ type: 'int' })
  change!: number;

  @Column({ type: 'text' })
  reason!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
