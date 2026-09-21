import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './coupon.entity.js';
import type { CreateCouponDto } from './dto/create-coupon.dto.js';
import type { UpdateCouponDto } from './dto/update-coupon.dto.js';

export interface CouponApplyResult {
  discountPercent: number;
  discountAmount: number;
}

@Injectable()
export class CouponsService {
  constructor(@InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>) {}

  async applyCoupon(code: string, subtotal: number): Promise<CouponApplyResult> {
    const coupon = await this.couponRepo.findOne({ where: { code } });
    if (!coupon || !coupon.active) {
      throw new NotFoundException('Invalid or inactive coupon code');
    }

    const discountPercent = Number(coupon.discountPercent);
    const discountAmount = Number(((subtotal * discountPercent) / 100).toFixed(2));
    return { discountPercent, discountAmount };
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
    });
    return this.couponRepo.save(coupon);
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
