import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CartItem } from './cart-item.entity.js';

@Injectable()
export class CartService {
  constructor(@InjectRepository(CartItem) private readonly cartRepo: Repository<CartItem>) {}

  findForUser(userId: string) {
    return this.cartRepo.find({ where: { userId } });
  }

  async addItem(userId: string, productId: string, quantity: number, variantId: string | null = null) {
    const existing = await this.cartRepo.findOne({
      where: { userId, productId, variantId: variantId ?? IsNull() },
    });
    if (existing) {
      existing.quantity += quantity;
      return this.cartRepo.save(existing);
    }

    const item = this.cartRepo.create({ userId, productId, variantId, quantity });
    return this.cartRepo.save(item);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.findOwnedItem(userId, itemId);
    item.quantity = quantity;
    return this.cartRepo.save(item);
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.findOwnedItem(userId, itemId);
    await this.cartRepo.remove(item);
  }

  private async findOwnedItem(userId: string, itemId: string) {
    const item = await this.cartRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    return item;
  }
}
