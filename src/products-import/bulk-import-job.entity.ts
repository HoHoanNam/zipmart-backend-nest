import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum BulkImportJobStatus {
  VALIDATED = 'validated',
  COMMITTED = 'committed',
}

export interface BulkImportRowError {
  row: number;
  message: string;
}

/**
 * `validRows` holds the already-`class-validator`-validated rows from
 * `dryRun()` (as plain JSON, not `Product` entities) so `commit(jobId)`
 * doesn't need the original CSV re-uploaded — the two calls are separate
 * HTTP requests (admin reviews the dry-run result first), so the parsed,
 * validated data has to live somewhere between them.
 */
@Entity('bulk_import_jobs')
export class BulkImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: BulkImportJobStatus, default: BulkImportJobStatus.VALIDATED })
  status!: BulkImportJobStatus;

  @Column({ name: 'total_rows', type: 'int' })
  totalRows!: number;

  @Column({ name: 'valid_row_count', type: 'int' })
  validRowCount!: number;

  @Column({ name: 'error_row_count', type: 'int' })
  errorRowCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  errors!: BulkImportRowError[] | null;

  @Column({ name: 'valid_rows', type: 'jsonb' })
  validRows!: Record<string, unknown>[];

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
