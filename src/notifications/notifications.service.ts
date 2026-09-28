import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity.js';
import type { BroadcastNotificationDto } from './dto/broadcast-notification.dto.js';
import { Notification, NotificationType } from './notification.entity.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

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
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}`, error as Error);
    }
  }

  /** Admin-triggered directly (not a side-effect of something else), so unlike `notifyUser()` this is allowed to throw — the admin should see it fail. */
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
    await this.notificationRepo.save(notifications);
    return { recipientCount: notifications.length };
  }
}
