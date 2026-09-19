import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity.js';
import { BehaviorEvent } from '../behaviors/behavior.entity.js';
import { Order } from '../orders/order.entity.js';
import { Product } from '../products/product.entity.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(BehaviorEvent) private readonly behaviorRepo: Repository<BehaviorEvent>,
  ) {}

  async getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayOrders, totalUsers, totalProducts, lowStockProducts] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .where('o.created_at >= :start', { start: startOfToday })
        .getMany(),
      this.userRepo.count(),
      this.productRepo.count(),
      this.productRepo
        .createQueryBuilder('p')
        .where('p.stock < :threshold', { threshold: 10 })
        .orderBy('p.stock', 'ASC')
        .limit(10)
        .getMany(),
    ]);

    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);

    return {
      todayOrderCount: todayOrders.length,
      todayRevenue,
      totalUsers,
      totalProducts,
      lowStockProducts,
    };
  }

  async getEngagement() {
    const eventCountsRaw = await this.behaviorRepo
      .createQueryBuilder('b')
      .select('b.event_type', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.event_type')
      .getRawMany<{ eventType: string; count: string }>();

    const eventCounts = Object.fromEntries(
      eventCountsRaw.map((row) => [row.eventType, Number(row.count)]),
    );

    const topViewedRaw = await this.behaviorRepo
      .createQueryBuilder('b')
      .select('b.product_id', 'productId')
      .addSelect('COUNT(*)', 'viewCount')
      .where('b.event_type = :type', { type: 'view' })
      .groupBy('b.product_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany<{ productId: string; viewCount: string }>();

    const products = topViewedRaw.length
      ? await this.productRepo.find({ where: { id: In(topViewedRaw.map((r) => r.productId)) } })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    const topViewed = topViewedRaw
      .map((row) => ({
        product: productById.get(row.productId) ?? null,
        viewCount: Number(row.viewCount),
      }))
      .filter((row) => row.product !== null);

    return { eventCounts, topViewed };
  }
}
