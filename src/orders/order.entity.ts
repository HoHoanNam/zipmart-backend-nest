import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  COD = 'cod',
  CREDIT = 'credit',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ name: 'recipient_name', type: 'varchar', nullable: true })
  recipientName!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', nullable: true })
  district!: string | null;

  @Column({ type: 'varchar', nullable: true })
  ward!: string | null;

  @Column({ name: 'street_address', type: 'varchar', nullable: true })
  streetAddress!: string | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.COD,
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'tax_amount', type: 'numeric', precision: 10, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 10, scale: 2, default: 0 })
  discountAmount!: string;

  @Column({ name: 'coupon_code', type: 'varchar', nullable: true })
  couponCode!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
