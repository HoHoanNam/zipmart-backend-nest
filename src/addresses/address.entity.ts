import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'recipient_name', type: 'varchar' })
  recipientName!: string;

  @Column({ name: 'phone_number', type: 'varchar' })
  phoneNumber!: string;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  district!: string;

  @Column({ type: 'varchar' })
  ward!: string;

  @Column({ name: 'street_address', type: 'varchar' })
  streetAddress!: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
