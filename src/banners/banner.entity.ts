import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl!: string;

  @Column({ type: 'varchar' })
  headline!: string;

  @Column({ type: 'varchar', nullable: true })
  subtext!: string | null;

  @Column({ name: 'cta_label', type: 'varchar', nullable: true })
  ctaLabel!: string | null;

  @Column({ name: 'cta_link', type: 'varchar', nullable: true })
  ctaLink!: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
