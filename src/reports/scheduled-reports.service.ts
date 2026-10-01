import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob, validateCronExpression } from 'cron';
import { Repository } from 'typeorm';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { MailService } from '../mail/mail.service.js';
import type { CreateScheduledReportDto } from './dto/create-scheduled-report.dto.js';
import type { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto.js';
import { ScheduledReport, ScheduledReportType } from './scheduled-report.entity.js';

/**
 * Dynamic per-row cron jobs via `SchedulerRegistry` (not the static
 * `@Cron()` decorator `UploadsCleanupJob`/`NotificationsDigestJob` use) —
 * the schedule itself is admin-editable data, not something fixed at
 * compile time. `onModuleInit()` re-registers every active row's job on
 * every app boot (in-memory registrations don't survive a restart), and
 * `create()`/`update()`/`remove()` keep the registry in sync with the DB
 * from then on.
 */
@Injectable()
export class ScheduledReportsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @InjectRepository(ScheduledReport) private readonly reportRepo: Repository<ScheduledReport>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly analyticsService: AnalyticsService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    const activeReports = await this.reportRepo.find({ where: { active: true } });
    for (const report of activeReports) {
      this.registerJob(report);
    }
  }

  findAll(): Promise<ScheduledReport[]> {
    return this.reportRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(userId: string, dto: CreateScheduledReportDto): Promise<ScheduledReport> {
    this.assertValidCron(dto.cronExpression);
    const report = await this.reportRepo.save(
      this.reportRepo.create({ ...dto, createdByUserId: userId }),
    );
    if (report.active) {
      this.registerJob(report);
    }
    return report;
  }

  async update(id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReport> {
    if (dto.cronExpression) {
      this.assertValidCron(dto.cronExpression);
    }
    const report = await this.findOrThrow(id);
    this.unregisterJob(report.id);

    Object.assign(report, dto);
    const saved = await this.reportRepo.save(report);
    if (saved.active) {
      this.registerJob(saved);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    this.unregisterJob(id);
    await this.reportRepo.delete({ id });
  }

  /** Also callable directly (e.g. a "run now" admin action) — not exposed as an endpoint in this task's scope, but `registerJob()`'s `onTick` calls exactly this. */
  async runReport(id: string): Promise<void> {
    const report = await this.findOrThrow(id);
    const { subject, html } = await this.buildReportEmail(report);

    for (const email of report.recipientEmails) {
      await this.mailService.sendMail({ to: email, subject, html });
    }

    report.lastRunAt = new Date();
    await this.reportRepo.save(report);
  }

  private async buildReportEmail(report: ScheduledReport): Promise<{ subject: string; html: string }> {
    switch (report.reportType) {
      case ScheduledReportType.REVENUE: {
        const data = await this.analyticsService.getRevenueReport({});
        const rows = data.days
          .map((day) => `<tr><td>${day.date}</td><td>${day.orderCount}</td><td>${day.revenue}</td></tr>`)
          .join('');
        return {
          subject: `[zipmart] Báo cáo doanh thu — ${report.name}`,
          html: `<h3>Doanh thu ${data.from} → ${data.to}</h3><table border="1" cellpadding="4"><tr><th>Ngày</th><th>Số đơn</th><th>Doanh thu</th></tr>${rows}</table><p>Tổng: ${data.totalOrders} đơn, ${data.totalRevenue}đ</p>`,
        };
      }
      case ScheduledReportType.TOP_PRODUCTS: {
        const data = await this.analyticsService.getTopProducts({});
        const rows = data
          .map((p) => `<li>${p.productName}: ${p.totalQuantity} sản phẩm, ${p.totalRevenue}đ</li>`)
          .join('');
        return {
          subject: `[zipmart] Sản phẩm bán chạy — ${report.name}`,
          html: `<h3>Top sản phẩm bán chạy</h3><ul>${rows}</ul>`,
        };
      }
      case ScheduledReportType.ORDERS_CSV: {
        // `MailService.sendMail()` has no attachment support — the CSV is
        // inlined as plain text instead of attached as a real .csv file.
        const { filename, csv } = await this.analyticsService.exportOrdersCsv({});
        return {
          subject: `[zipmart] Danh sách đơn hàng — ${report.name} (${filename})`,
          html: `<h3>${filename}</h3><pre style="font-family: monospace; white-space: pre-wrap;">${this.escapeHtml(csv)}</pre>`,
        };
      }
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private assertValidCron(cronExpression: string): void {
    if (!validateCronExpression(cronExpression).valid) {
      throw new BadRequestException('Biểu thức cron không hợp lệ');
    }
  }

  private jobName(id: string): string {
    return `scheduled-report:${id}`;
  }

  private registerJob(report: ScheduledReport): void {
    const job = new CronJob(report.cronExpression, () => {
      this.runReport(report.id).catch((error) =>
        this.logger.error(`Scheduled report ${report.id} failed`, error as Error),
      );
    });
    this.schedulerRegistry.addCronJob(this.jobName(report.id), job);
    job.start();
  }

  private unregisterJob(id: string): void {
    const name = this.jobName(id);
    if (this.schedulerRegistry.getCronJobs().has(name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
  }

  private async findOrThrow(id: string): Promise<ScheduledReport> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('Scheduled report not found');
    }
    return report;
  }
}
