import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  code!: string;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2 })
  discountPercent!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  /** Null = never expires — matches every coupon created before this feature. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  /** Null = unlimited total uses. */
  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  /** Null = no minimum order amount required. */
  @Column({ name: 'min_order_amount', type: 'numeric', precision: 10, scale: 2, nullable: true })
  minOrderAmount!: string | null;

  /** Null = unlimited uses per user. */
  @Column({ name: 'per_user_limit', type: 'int', nullable: true })
  perUserLimit!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
