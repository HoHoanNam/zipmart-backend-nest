import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service.js';

/** Same split as `UploadsCleanupJob` — schedule + try/catch here, all real logic in `NotificationsService.runEmailDigest()`. */
@Injectable()
export class NotificationsDigestJob {
  private readonly logger = new Logger(NotificationsDigestJob.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyDigest(): Promise<void> {
    try {
      await this.notificationsService.runEmailDigest();
    } catch (error) {
      this.logger.error('Failed to run notifications email digest', error as Error);
    }
  }
}
