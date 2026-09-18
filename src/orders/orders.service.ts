import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartService } from '../cart/cart.service.js';
import { ProductsService } from '../products/products.service.js';
import { OrderItem } from './order-item.entity.js';
import { Order } from './order.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  findForUser(userId: string) {
    return this.orderRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async checkout(userId: string) {
    const cartItems = await this.cartService.findForUser(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let total = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cartItems) {
      const product = await this.productsService.findOne(cartItem.productId);
      const unitPrice = Number(product.price);
      total += unitPrice * cartItem.quantity;
      orderItems.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        unitPrice: unitPrice.toFixed(2),
      });
    }

    const order = this.orderRepo.create({ userId, total: total.toFixed(2) });
    await this.orderRepo.save(order);

    for (const item of orderItems) {
      await this.orderItemRepo.save(this.orderItemRepo.create({ ...item, orderId: order.id }));
    }

    for (const cartItem of cartItems) {
      await this.cartService.removeItem(userId, cartItem.id);
    }

    return order;
  }
}
