import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
@Index(['userId', 'productId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'author_name', type: 'varchar' })
  authorName!: string;

  @Column({ name: 'author_avatar_url', type: 'varchar', nullable: true })
  authorAvatarUrl!: string | null;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ type: 'boolean', default: false })
  hidden!: boolean;

  @Column({ name: 'admin_reply', type: 'text', nullable: true })
  adminReply!: string | null;

  @Column({ name: 'admin_reply_at', type: 'timestamptz', nullable: true })
  adminReplyAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
