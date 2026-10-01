import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SupportConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('support_conversations')
export class SupportConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: SupportConversationStatus, default: SupportConversationStatus.OPEN })
  status!: SupportConversationStatus;

  /** Null = unassigned — shows up in the admin console's "chờ tiếp nhận" queue. */
  @Column({ name: 'assigned_admin_id', type: 'uuid', nullable: true })
  assignedAdminId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Bumped on every new message — lets the admin conversation list sort by recent activity without a join against `support_messages`. */
  @UpdateDateColumn({ name: 'last_message_at', type: 'timestamptz' })
  lastMessageAt!: Date;
}
