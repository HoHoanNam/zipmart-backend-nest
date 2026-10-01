import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row per user, created lazily on first read/write (see `LoyaltyService.getOrCreateAccount()`) rather than at registration — most users never redeem, so provisioning on demand avoids a write on every signup. */
@Entity('loyalty_accounts')
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'points_balance', type: 'int', default: 0 })
  pointsBalance!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
