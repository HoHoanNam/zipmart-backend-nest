import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum CategorySlug {
  ELECTRONICS = 'electronics',
  APPAREL = 'apparel',
  HOUSEHOLD = 'household',
  FOOD = 'food',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  slug!: string;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
