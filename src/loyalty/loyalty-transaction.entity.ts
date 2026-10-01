import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
}

/** Signed ledger entry — `points` is positive for `earn`, negative for `redeem`, so `balanceAfter = balanceBefore + points` always, and a customer's point history is just this table ordered by `createdAt`. */
@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type!: LoyaltyTransactionType;

  @Column({ type: 'int' })
  points!: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
