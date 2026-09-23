import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId!: string | null;

  /** Snapshot at order time — stays stable even if the variant is later renamed/removed. e.g. "M / Đen". */
  @Column({ name: 'variant_label', type: 'varchar', nullable: true })
  variantLabel!: string | null;

  /** Snapshot at order time — stays stable even if the product is later renamed/removed. */
  @Column({ name: 'product_name', type: 'varchar', nullable: true })
  productName!: string | null;

  @Column({ name: 'product_image_url', type: 'varchar', nullable: true })
  productImageUrl!: string | null;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: string;
}
