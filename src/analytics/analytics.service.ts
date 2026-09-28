import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity.js';
import { BehaviorEvent } from '../behaviors/behavior.entity.js';
import { Order } from '../orders/order.entity.js';
import { Product } from '../products/product.entity.js';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../products/products.constants.js';
import type { ReportRangeDto, TopProductsQueryDto } from './dto/report-range.dto.js';

/** Same convention as `soldCountSubquery()` in `products.service.ts` — an order only counts as realized revenue/sales once it's `paid` (or `completed`), not while still `pending`/`shipped`/`cancelled`. Kept identical on purpose so "revenue" here and "Đã bán N" on product cards never disagree. */
const REVENUE_STATUSES = ['paid', 'completed'];

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
      // Same `COALESCE(threshold, default)` comparison as `ProductsService.findLowStock()` — kept in sync deliberately so this dashboard count and the `/inventory` low-stock list never disagree.
      this.productRepo
        .createQueryBuilder('p')
        .where('p.stock < COALESCE(p.lowStockThreshold, :defaultThreshold)', {
          defaultThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        })
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

  async getRevenueReport(dto: ReportRangeDto) {
    const { start, end } = this.resolveRange(dto.from, dto.to);

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select("to_char(o.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(o.total)', 'revenue')
      .where('o.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .andWhere('o.created_at BETWEEN :start AND :end', { start, end })
      .groupBy("to_char(o.created_at, 'YYYY-MM-DD')")
      .orderBy("to_char(o.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany<{ date: string; orderCount: string; revenue: string | null }>();

    const days = rows.map((row) => ({
      date: row.date,
      orderCount: Number(row.orderCount),
      revenue: Number(row.revenue ?? 0),
    }));

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      days,
      totalOrders: days.reduce((sum, day) => sum + day.orderCount, 0),
      totalRevenue: days.reduce((sum, day) => sum + day.revenue, 0),
    };
  }

  async getTopProducts(dto: TopProductsQueryDto) {
    const { start, end } = this.resolveRange(dto.from, dto.to);
    const limit = dto.limit ?? 10;

    // Grouped by `product_id` only — NOT also `order_items.product_name`.
    // `product_name` is a per-order snapshot (can legitimately differ across
    // orders after a rename, and some legacy/test rows even have it NULL),
    // so grouping by both would fragment one product into several rows with
    // diluted quantities instead of one consolidated ranking entry. The
    // current name is looked up separately below instead.
    const rows = await this.orderRepo.manager
      .createQueryBuilder()
      .select('order_items.product_id', 'productId')
      .addSelect('SUM(order_items.quantity)', 'totalQuantity')
      .addSelect('SUM(order_items.quantity * order_items.unit_price)', 'totalRevenue')
      .from('order_items', 'order_items')
      .innerJoin('orders', 'orders', 'orders.id = order_items.order_id')
      .where('orders.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .andWhere('orders.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('order_items.product_id')
      .orderBy('SUM(order_items.quantity)', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; totalQuantity: string; totalRevenue: string }>();

    const products = rows.length
      ? await this.productRepo.find({ where: { id: In(rows.map((row) => row.productId)) } })
      : [];
    const nameByProductId = new Map(products.map((product) => [product.id, product.name]));

    return rows.map((row) => ({
      productId: row.productId,
      productName: nameByProductId.get(row.productId) ?? '(Sản phẩm đã xoá)',
      totalQuantity: Number(row.totalQuantity),
      totalRevenue: Number(row.totalRevenue),
    }));
  }

  /** Returns raw CSV text (with a UTF-8 BOM so Excel opens Vietnamese text correctly) rather than streaming a file response — kept consistent with the rest of this API, which is JSON-only with no existing file-download endpoints; the frontend turns this into a downloadable Blob. */
  async exportOrdersCsv(dto: ReportRangeDto): Promise<{ filename: string; csv: string }> {
    const { start, end } = this.resolveRange(dto.from, dto.to);

    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.created_at BETWEEN :start AND :end', { start, end })
      .orderBy('o.created_at', 'DESC')
      .getMany();

    const userIds = [...new Set(orders.map((order) => order.userId))];
    const users = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    const emailByUserId = new Map(users.map((user) => [user.id, user.email]));

    const header = ['Mã đơn', 'Email khách', 'Trạng thái', 'Tổng tiền', 'Ngày tạo'];
    const rows = orders.map((order) => [
      order.id,
      emailByUserId.get(order.userId) ?? '',
      order.status,
      order.total,
      order.createdAt.toISOString(),
    ]);
    const UTF8_BOM = String.fromCharCode(0xfeff);
    const csv =
      UTF8_BOM +
      [header, ...rows].map((cols) => cols.map((cell) => this.escapeCsvCell(cell)).join(',')).join('\r\n');

    const rangeLabel = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`;
    return { filename: `orders-${rangeLabel}.csv`, csv };
  }

  private escapeCsvCell(value: string): string {
    return /["\r\n,]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  /** `to` defaults to now, `from` defaults to 30 days before `to`; both normalized so `to` is treated as an inclusive end-of-day boundary. */
  private resolveRange(from?: string, to?: string): { start: Date; end: Date } {
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    return { start, end };
  }
}
