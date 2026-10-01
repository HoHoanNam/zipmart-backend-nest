import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row per user, created lazily on first write (see `NotificationsService.updatePreferences()`) — a missing row means "defaults" (both true), same lazy-provisioning pattern as `LoyaltyAccount`. */
@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'email_digest_enabled', type: 'boolean', default: true })
  emailDigestEnabled!: boolean;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
