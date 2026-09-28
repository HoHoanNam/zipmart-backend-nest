import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Coupon } from './coupon.entity.js';
import { CouponUsage } from './coupon-usage.entity.js';
import type { CreateCouponDto } from './dto/create-coupon.dto.js';
import type { UpdateCouponDto } from './dto/update-coupon.dto.js';

export interface CouponApplyResult {
  discountPercent: number;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage) private readonly couponUsageRepo: Repository<CouponUsage>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Preview only (e.g. cart page showing the discount before checkout) — read-only, does not consume a usage slot. Must apply the exact same rules as `applyCouponInTransaction()` below, or a coupon that previews fine could still fail at actual checkout. */
  async applyCoupon(code: string, subtotal: number, userId: string): Promise<CouponApplyResult> {
    const coupon = await this.couponRepo.findOne({ where: { code } });
    this.assertBasicRules(coupon, subtotal);
    await this.assertPerUserLimit(this.couponUsageRepo, coupon, userId);
    return this.computeDiscount(coupon, subtotal);
  }

  /**
   * The real, order-committing application — called from inside
   * `OrdersService.checkout()`'s transaction, with `manager` being that
   * same transaction. Locks the coupon row (`pessimistic_write`, same
   * technique `checkout()` already uses for `Product`/`ProductVariant`) so
   * two concurrent checkouts can't both read `usedCount` below the limit
   * and race past it.
   */
  async applyCouponInTransaction(
    manager: EntityManager,
    code: string,
    subtotal: number,
    userId: string,
  ): Promise<CouponApplyResult & { couponId: string }> {
    const couponRepo = manager.getRepository(Coupon);
    const coupon = await couponRepo.findOne({ where: { code }, lock: { mode: 'pessimistic_write' } });
    this.assertBasicRules(coupon, subtotal);
    await this.assertPerUserLimit(manager.getRepository(CouponUsage), coupon, userId);

    const result = this.computeDiscount(coupon, subtotal);
    await couponRepo.increment({ id: coupon.id }, 'usedCount', 1);
    return { ...result, couponId: coupon.id };
  }

  /** Called from the same checkout transaction right after the order row is saved. */
  recordUsage(manager: EntityManager, couponId: string, userId: string, orderId: string): Promise<CouponUsage> {
    const repo = manager.getRepository(CouponUsage);
    return repo.save(repo.create({ couponId, userId, orderId }));
  }

  private assertBasicRules(coupon: Coupon | null, subtotal: number): asserts coupon is Coupon {
    if (!coupon || !coupon.active) {
      throw new NotFoundException('Invalid or inactive coupon code');
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }
    if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${coupon.minOrderAmount} để dùng mã này`,
      );
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }
  }

  private async assertPerUserLimit(
    couponUsageRepo: Repository<CouponUsage>,
    coupon: Coupon,
    userId: string,
  ): Promise<void> {
    if (coupon.perUserLimit === null) return;
    const usageCount = await couponUsageRepo.count({ where: { couponId: coupon.id, userId } });
    if (usageCount >= coupon.perUserLimit) {
      throw new BadRequestException('Bạn đã dùng hết lượt sử dụng cho mã này');
    }
  }

  private computeDiscount(coupon: Coupon, subtotal: number): CouponApplyResult {
    const discountPercent = Number(coupon.discountPercent);
    const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    return { discountPercent, discountAmount };
  }

  /** Coupons still visible/usable right now — for a customer-facing "available coupons" list. */
  async findAvailable(): Promise<Coupon[]> {
    return this.couponRepo
      .createQueryBuilder('coupon')
      .where('coupon.active = true')
      .andWhere('(coupon.expiresAt IS NULL OR coupon.expiresAt > :now)', { now: new Date() })
      .andWhere('(coupon.usageLimit IS NULL OR coupon.usedCount < coupon.usageLimit)')
      .orderBy('coupon.createdAt', 'DESC')
      .getMany();
  }

  findAll(): Promise<Coupon[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const existing = await this.couponRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const coupon = this.couponRepo.create({
      code: dto.code,
      discountPercent: dto.discountPercent.toFixed(2),
      active: dto.active ?? true,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      usageLimit: dto.usageLimit ?? null,
      minOrderAmount: dto.minOrderAmount !== undefined ? dto.minOrderAmount.toFixed(2) : null,
      perUserLimit: dto.perUserLimit ?? null,
    });
    const saved = await this.couponRepo.save(coupon);

    if (saved.active) {
      // A side-effect of coupon creation, not the point of the request —
      // a broadcast failure must never fail coupon creation itself.
      this.notificationsService
        .broadcast({
          title: 'Mã giảm giá mới',
          body: `Mã "${saved.code}" giảm ${Number(saved.discountPercent)}% vừa được ra mắt!`,
        })
        .catch((error) => this.logger.error('Failed to broadcast new-coupon notification', error));
    }

    return saved;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.discountPercent !== undefined) {
      coupon.discountPercent = dto.discountPercent.toFixed(2);
    }
    if (dto.active !== undefined) {
      coupon.active = dto.active;
    }
    if (dto.expiresAt !== undefined) {
      coupon.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.usageLimit !== undefined) {
      coupon.usageLimit = dto.usageLimit;
    }
    if (dto.minOrderAmount !== undefined) {
      coupon.minOrderAmount = dto.minOrderAmount !== null ? dto.minOrderAmount.toFixed(2) : null;
    }
    if (dto.perUserLimit !== undefined) {
      coupon.perUserLimit = dto.perUserLimit;
    }
    return this.couponRepo.save(coupon);
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    await this.couponRepo.remove(coupon);
  }
}
