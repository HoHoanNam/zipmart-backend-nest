import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row per browser/device subscribed to Web Push — mirrors the browser's `PushSubscription` object (`endpoint` + the `p256dh`/`auth` keys), see `NotificationsService.sendPush()`. Self-cleaning: a `410 Gone`/`404` response from the push service deletes the row (see the same method). */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', unique: true })
  endpoint!: string;

  @Column({ type: 'varchar' })
  p256dh!: string;

  @Column({ type: 'varchar' })
  auth!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
