import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentGateway {
  VNPAY = 'vnpay',
  MOMO = 'momo',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * One row per checkout attempt against a gateway — an order can have more
 * than one `Payment` row over time (e.g. a failed VNPay attempt followed by
 * a retry), so `orderId` is not unique. `id` doubles as the gateway's
 * `vnp_TxnRef`/`orderId` reference so a return/IPN callback can look the
 * attempt back up.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway!: PaymentGateway;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  /** The gateway's own transaction id (`vnp_TransactionNo`, Momo `transId`) — set once the gateway confirms, null while pending. */
  @Column({ name: 'gateway_transaction_id', type: 'varchar', nullable: true })
  gatewayTransactionId!: string | null;

  /** Full last callback payload (return or IPN) — kept for support/debugging, never surfaced to the client as-is. */
  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
