import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from './wishlist-item.entity.js';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem) private readonly wishlistRepo: Repository<WishlistItem>,
  ) {}

  findForUser(userId: string) {
    return this.wishlistRepo.find({ where: { userId }, order: { addedAt: 'DESC' } });
  }

  async addItem(userId: string, productId: string): Promise<WishlistItem> {
    const existing = await this.wishlistRepo.findOne({ where: { userId, productId } });
    if (existing) {
      return existing;
    }

    const item = this.wishlistRepo.create({ userId, productId });
    return this.wishlistRepo.save(item);
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const item = await this.wishlistRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }
    await this.wishlistRepo.remove(item);
  }
}
