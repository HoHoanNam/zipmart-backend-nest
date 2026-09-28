import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row per successful (order-committing) coupon use — backs `Coupon.perUserLimit`. Preview calls (`POST /coupons/apply`) never write here, only an actual `checkout()` does. */
@Entity('coupon_usages')
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @CreateDateColumn({ name: 'used_at', type: 'timestamptz' })
  usedAt!: Date;
}
