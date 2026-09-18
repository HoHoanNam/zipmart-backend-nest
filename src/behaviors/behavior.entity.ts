import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum BehaviorEventType {
  VIEW = 'view',
  CLICK = 'click',
  ADD_TO_CART = 'add_to_cart',
  PURCHASE = 'purchase',
}

@Entity('behavior_events')
@Index(['userId', 'productId', 'occurredAt'])
export class BehaviorEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'event_type', type: 'enum', enum: BehaviorEventType })
  eventType!: BehaviorEventType;

  @Column({ name: 'event_weight', type: 'float' })
  eventWeight!: number;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;
}
