import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

/**
 * `requested` → `approved`/`rejected` (admin decision) → `approved` then
 * resolves straight to `refunded` (a succeeded gateway `Payment` exists for
 * the order, refunded via `PaymentsService.refund()`) or `completed` (COD
 * order with no gateway payment — refund handled manually offline, this
 * status just closes the request). See `ReturnsService.resolve()`.
 */
export enum ReturnStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
  COMPLETED = 'completed',
}

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'order_item_id', type: 'uuid' })
  orderItemId!: string;

  @Column({ type: 'enum', enum: ReturnReason })
  reason!: ReturnReason;

  /** Free-text detail from the customer, and later the admin's decision note. */
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.REQUESTED })
  status!: ReturnStatus;

  /** Set once resolved to `refunded`/`completed` — the amount actually credited back (the returned item's line total, not the whole order). */
  @Column({ name: 'refund_amount', type: 'numeric', precision: 10, scale: 2, nullable: true })
  refundAmount!: string | null;

  /** The `Payment` row refunded via the gateway, when one exists — null for COD orders refunded manually offline. */
  @Column({ name: 'refund_payment_id', type: 'uuid', nullable: true })
  refundPaymentId!: string | null;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
