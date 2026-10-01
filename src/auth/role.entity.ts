import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** `isSystem` roles (Super Admin, Customer) can't be renamed/deleted from the admin UI — they're the migration bridge from the old binary `UserRole` enum. */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
