import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as webpush from 'web-push';
import { User } from '../auth/user.entity.js';
import { MailService } from '../mail/mail.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { BroadcastNotificationDto } from './dto/broadcast-notification.dto.js';
import type { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto.js';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';
import { NotificationPreference } from './notification-preference.entity.js';
import { Notification, NotificationType } from './notification.entity.js';
import { PushSubscription } from './push-subscription.entity.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly vapidConfigured: boolean;
  private readonly vapidPublicKey: string;

  constructor(
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY', '');
    this.vapidPublicKey = publicKey;
    this.vapidConfigured = Boolean(publicKey && privateKey);
    if (this.vapidConfigured) {
      webpush.setVapidDetails(
        this.configService.get<string>('VAPID_SUBJECT', 'mailto:support@zipmart.example.com'),
        publicKey,
        privateKey,
      );
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — web push notifications are disabled.');
    }
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  findForUser(userId: string): Promise<Notification[]> {
    return this.notificationRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  countUnread(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
  }

  /**
   * Used by other modules (orders, coupons) as a side-effect of their own
   * core action — a failure here must never surface as a failure of that
   * action, so errors are caught and logged, never thrown. This is why the
   * try/catch lives here once instead of being repeated at every call site.
   */
  async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    relatedEntityId?: string,
  ): Promise<void> {
    try {
      const notification = this.notificationRepo.create({
        userId,
        type,
        title,
        body,
        relatedEntityId: relatedEntityId ?? null,
      });
      await this.notificationRepo.save(notification);
      await this.deliverRealtimeAndPush(notification);
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}`, error as Error);
    }
  }

  /** Admin-triggered directly (not a side-effect of something else), so unlike `notifyUser()` this is allowed to throw — the admin should see it fail. Realtime/push delivery per recipient is still best-effort (logged, not thrown) — a broadcast that reaches 999/1000 online users shouldn't look like a failed request. */
  async broadcast(dto: BroadcastNotificationDto): Promise<{ recipientCount: number }> {
    const users = await this.userRepo.find({ select: { id: true } });
    if (users.length === 0) {
      return { recipientCount: 0 };
    }

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        userId: user.id,
        type: NotificationType.BROADCAST,
        title: dto.title,
        body: dto.body,
        relatedEntityId: null,
      }),
    );
    const saved = await this.notificationRepo.save(notifications);

    for (const notification of saved) {
      await this.deliverRealtimeAndPush(notification).catch((error) =>
        this.logger.error(`Failed to deliver broadcast to user ${notification.userId}`, error as Error),
      );
    }
    return { recipientCount: notifications.length };
  }

  // ---------- Push subscriptions ----------

  async subscribeToPush(userId: string, dto: CreatePushSubscriptionDto): Promise<void> {
    const existing = await this.pushSubscriptionRepo.findOne({ where: { endpoint: dto.endpoint } });
    if (existing) {
      // The same browser can re-subscribe (e.g. after clearing site data) —
      // upsert onto the existing row rather than erroring, and re-point it
      // at whichever user it now belongs to.
      existing.userId = userId;
      existing.p256dh = dto.p256dh;
      existing.auth = dto.auth;
      await this.pushSubscriptionRepo.save(existing);
      return;
    }
    await this.pushSubscriptionRepo.save(this.pushSubscriptionRepo.create({ userId, ...dto }));
  }

  async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    await this.pushSubscriptionRepo.delete({ userId, endpoint });
  }

  // ---------- Preferences ----------

  async getPreferences(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferenceRepo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.preferenceRepo.create({ userId, emailDigestEnabled: true, pushEnabled: true });
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepo.findOne({ where: { userId } });
    if (!preference) {
      preference = this.preferenceRepo.create({ userId });
    }
    if (dto.emailDigestEnabled !== undefined) {
      preference.emailDigestEnabled = dto.emailDigestEnabled;
    }
    if (dto.pushEnabled !== undefined) {
      preference.pushEnabled = dto.pushEnabled;
    }
    return this.preferenceRepo.save(preference);
  }

  // ---------- Delivery ----------

  /** Fans a single persisted `Notification` row out over realtime (always) and Web Push (if the recipient has it enabled and at least one active subscription). Called right after `notificationRepo.save()` in both `notifyUser()` and `broadcast()`. */
  private async deliverRealtimeAndPush(notification: Notification): Promise<void> {
    this.realtimeGateway.emitToUser(notification.userId, 'notification:new', notification);

    const preference = await this.preferenceRepo.findOne({ where: { userId: notification.userId } });
    if (preference && !preference.pushEnabled) return;
    await this.sendPush(notification);
  }

  private async sendPush(notification: Notification): Promise<void> {
    if (!this.vapidConfigured) return;

    const subscriptions = await this.pushSubscriptionRepo.find({ where: { userId: notification.userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title: notification.title, body: notification.body, id: notification.id });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
          );
        } catch (error) {
          const statusCode = (error as webpush.WebPushError).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription no longer valid on the browser/push service side — self-clean.
            await this.pushSubscriptionRepo.delete({ id: subscription.id });
          } else {
            this.logger.error(`Failed to send push to subscription ${subscription.id}`, error as Error);
          }
        }
      }),
    );
  }

  // ---------- Email digest ----------

  /**
   * Called by `NotificationsDigestJob`'s daily `@Cron` — mirrors
   * `UploadsCleanupJob`'s split (job = schedule + try/catch, all the real
   * logic lives in the service). Groups every not-yet-digested
   * notification by user, skips users who opted out
   * (`emailDigestEnabled === false`; a missing preference row means
   * "default enabled"), sends one email per user, then stamps
   * `digestSentAt` so the same notification is never emailed twice.
   */
  async runEmailDigest(): Promise<void> {
    const pending = await this.notificationRepo.find({
      where: { digestSentAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    if (pending.length === 0) return;

    const byUser = new Map<string, Notification[]>();
    for (const notification of pending) {
      const list = byUser.get(notification.userId) ?? [];
      list.push(notification);
      byUser.set(notification.userId, list);
    }

    for (const [userId, items] of byUser) {
      const preference = await this.preferenceRepo.findOne({ where: { userId } });
      if (preference && !preference.emailDigestEnabled) continue;

      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) continue;

      const listHtml = items
        .map((n) => `<li><strong>${this.escapeHtml(n.title)}</strong>: ${this.escapeHtml(n.body)}</li>`)
        .join('');
      await this.mailService.sendMail({
        to: user.email,
        subject: `Bạn có ${items.length} thông báo mới từ zipmart`,
        html: `<p>Tổng hợp thông báo gần đây của bạn:</p><ul>${listHtml}</ul>`,
      });

      await this.notificationRepo.update(
        { id: In(items.map((n) => n.id)) },
        { digestSentAt: new Date() },
      );
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
