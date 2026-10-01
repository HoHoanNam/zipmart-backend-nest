import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificationType {
  ORDER_STATUS = 'order_status',
  COUPON = 'coupon',
  BROADCAST = 'broadcast',
  RETURN_STATUS = 'return_status',
}

/**
 * Always targeted at exactly one user — even a "broadcast" is fanned out
 * into one row per user at creation time (see `NotificationsService.broadcast()`)
 * rather than stored once with a nullable `userId`. Simpler than a shared
 * row + a separate per-user read-tracking table, and this app's user count
 * makes the storage duplication a non-issue.
 */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: NotificationType;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  /** Order id, coupon id, etc. — whatever the notification is about, for the frontend to deep-link. Not a FK: the referenced entity type varies by `type`. */
  @Column({ name: 'related_entity_id', type: 'uuid', nullable: true })
  relatedEntityId!: string | null;

  /** Null = not yet included in an email digest. Set by `NotificationsDigestJob` once it emails this notification — deliberately independent of `isRead` (a user might read it in-app before the digest runs, or vice versa), so the digest never re-sends the same notification twice. */
  @Column({ name: 'digest_sent_at', type: 'timestamptz', nullable: true })
  digestSentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
