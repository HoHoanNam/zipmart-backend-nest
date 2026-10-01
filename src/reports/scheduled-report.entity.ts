import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ScheduledReportType {
  REVENUE = 'revenue',
  TOP_PRODUCTS = 'top_products',
  ORDERS_CSV = 'orders_csv',
}

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'report_type', type: 'enum', enum: ScheduledReportType })
  reportType!: ScheduledReportType;

  /** Standard 5-field cron syntax, validated with `cron`'s `validateCronExpression()` before being accepted — see `ScheduledReportsService.assertValidCron()`. */
  @Column({ name: 'cron_expression', type: 'varchar' })
  cronExpression!: string;

  @Column({ name: 'recipient_emails', type: 'jsonb' })
  recipientEmails!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  /** Null = never run yet. Set by `ScheduledReportsService.runReport()` after each successful send. */
  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
