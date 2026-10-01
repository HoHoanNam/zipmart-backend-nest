import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One row per successful mutation on a handler tagged `@Audit(entityType)` — see `AuditInterceptor`. Failed requests aren't logged here (the interceptor only fires on a successful response); this is an activity trail for admin mutations, not a full request log. */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Null in principle (an unauthenticated call could theoretically hit a tagged handler), though in practice every tagged handler so far sits behind `JwtAuthGuard`. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  /** From the `@Audit('product')` decorator argument — groups rows by feature/entity. */
  @Column({ name: 'entity_type', type: 'varchar' })
  entityType!: string;

  /** Route `:id` param if present, else the response body's own `id` field (covers a `POST` that creates something new) — null if neither was available. */
  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId!: string | null;

  @Column({ type: 'varchar' })
  method!: string;

  @Column({ type: 'varchar' })
  path!: string;

  @Column({ name: 'status_code', type: 'int' })
  statusCode!: number;

  /** Request body at call time, sanitized — see `AuditInterceptor`'s redaction list — so no password/token field is ever persisted here. */
  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
