import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ModerateReviewDto } from './dto/moderate-review.dto.js';
import type { UpdateReviewDto } from './dto/update-review.dto.js';
import { Review } from './review.entity.js';

export interface ReviewSummary {
  average: number;
  count: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** Public — excludes admin-hidden reviews. See `findAllAdmin()` for moderation, which sees everything. */
  findForProduct(productId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { productId, hidden: false },
      order: { createdAt: 'DESC' },
    });
  }

  /** Admin-only — every review for a product (or all products), hidden or not, so moderators can find what they've already hidden too. */
  findAllAdmin(productId?: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: productId ? { productId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async moderate(reviewId: string, dto: ModerateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (dto.hidden !== undefined) {
      review.hidden = dto.hidden;
    }
    if (dto.adminReply !== undefined) {
      review.adminReply = dto.adminReply.trim() || null;
      review.adminReplyAt = review.adminReply ? new Date() : null;
    }
    return this.reviewRepo.save(review);
  }

  /** Public — same `hidden = false` filter as `findForProduct()`, kept as one query rather than filtering in JS so a hidden review's rating can never leak into the average even transiently. */
  async getSummaryForProduct(productId: string): Promise<ReviewSummary> {
    const raw = await this.reviewRepo
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId = :productId', { productId })
      .andWhere('review.hidden = false')
      .getRawOne<{ average: string | null; count: string }>();

    const count = Number(raw?.count ?? 0);
    if (count === 0) {
      return { average: 0, count: 0 };
    }

    return { average: Number(raw?.average), count };
  }

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const existing = await this.reviewRepo.findOne({
      where: { userId, productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const authorName = user ? user.email.split('@')[0] : 'Anonymous';

    const review = this.reviewRepo.create({
      userId,
      productId: dto.productId,
      authorName,
      authorAvatarUrl: null,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.reviewRepo.save(review);
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.findOwnedOrThrow(userId, reviewId);
    Object.assign(review, dto);
    return this.reviewRepo.save(review);
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    const review = await this.findOwnedOrThrow(userId, reviewId);
    await this.reviewRepo.remove(review);
  }

  private async findOwnedOrThrow(userId: string, reviewId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId, userId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }
}
