import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/user.entity.js';
import { CartService } from '../cart/cart.service.js';
import { ProductsService } from '../products/products.service.js';
import { OrderItem } from './order-item.entity.js';
import { Order, type OrderStatus } from './order.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService,
  ) {}

  findForUser(userId: string) {
    return this.orderRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAllAdmin(): Promise<(Order & { userEmail: string | null })[]> {
    const orders = await this.orderRepo.find({ order: { createdAt: 'DESC' } });
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

    return orders.map((order) => ({
      ...order,
      userEmail: emailByUserId.get(order.userId) ?? null,
    }));
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status;
    await this.orderRepo.save(order);
    return order;
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
