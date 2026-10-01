import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/user.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { NotificationPreference } from './notification-preference.entity.js';
import { Notification } from './notification.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsDigestJob } from './notifications-digest.job.js';
import { NotificationsService } from './notifications.service.js';
import { PushSubscription } from './push-subscription.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, PushSubscription, NotificationPreference]),
    AuthModule,
    MailModule,
    RealtimeModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsDigestJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}
