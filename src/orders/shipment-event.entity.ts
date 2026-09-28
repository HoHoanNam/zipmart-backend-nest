import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OrderStatus } from './order.entity.js';

/**
 * Append-only audit trail alongside `Order.status` — does not replace it.
 * `Order.status` stays the single "current state" field every other query
 * reads; this table only adds a history of how it got there, so the
 * frontend timeline can render extra detail (notes, exact timestamps) while
 * still falling back to the plain 4-step status stepper for older orders
 * that predate this table.
 */
@Entity('shipment_events')
export class ShipmentEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  /** `varchar`, not a DB enum type — avoids coordinating a second Postgres enum type in lockstep with `orders_status_enum` for what's app-level-constrained anyway (`OrderStatus` on the TS side). */
  @Column({ type: 'varchar' })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;
}
