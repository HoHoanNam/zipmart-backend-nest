import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Stores a SHA-256 hash of the token, not the token itself — same
 * reasoning as a password hash (a DB read/leak shouldn't hand out usable
 * reset tokens), but hashed with plain SHA-256 rather than bcrypt: the
 * token is already a high-entropy random value (unlike a human password),
 * so it doesn't need bcrypt's slow, salted comparison — a direct
 * `WHERE token_hash = :hash` lookup is enough and lets this stay a simple
 * indexed equality query instead of loading every unexpired row to bcrypt-compare each one.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /** Null = not yet used. A reset link is single-use — set on successful `resetPassword()`. */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
