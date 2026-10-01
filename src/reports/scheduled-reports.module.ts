import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { ScheduledReport } from './scheduled-report.entity.js';
import { ScheduledReportsController } from './scheduled-reports.controller.js';
import { ScheduledReportsService } from './scheduled-reports.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledReport]), AuthModule, AnalyticsModule, MailModule],
  controllers: [ScheduledReportsController],
  providers: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
