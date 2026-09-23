import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity.js';
import type { CreateBannerDto } from './dto/create-banner.dto.js';
import type { UpdateBannerDto } from './dto/update-banner.dto.js';

@Injectable()
export class BannersService {
  constructor(@InjectRepository(Banner) private readonly bannerRepo: Repository<Banner>) {}

  findActive(): Promise<Banner[]> {
    // `id` as a tiebreaker: Postgres doesn't guarantee stable ordering
    // between rows that tie on sortOrder — same class of bug as the
    // product pagination tiebreaker (see docs/study), just lower stakes
    // here (display order flicker, not duplicate/missing pages).
    return this.bannerRepo.find({
      where: { active: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  findAll(): Promise<Banner[]> {
    return this.bannerRepo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepo.create({
      imageUrl: dto.imageUrl,
      headline: dto.headline,
      subtext: dto.subtext ?? null,
      ctaLabel: dto.ctaLabel ?? null,
      ctaLink: dto.ctaLink ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    });
    return this.bannerRepo.save(banner);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    Object.assign(banner, dto);
    return this.bannerRepo.save(banner);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    await this.bannerRepo.remove(banner);
  }
}
