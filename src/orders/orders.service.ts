import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../auth/user.entity.js';
import { CartItem } from '../cart/cart-item.entity.js';
import { CartService } from '../cart/cart.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CouponsService } from '../coupons/coupons.service.js';
import { Product } from '../products/product.entity.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { UpdateOrderAddressDto } from './dto/update-order-address.dto.js';
import { OrderItem } from './order-item.entity.js';
import { Order, OrderStatus } from './order.entity.js';
import { VAT_RATE } from './orders.constants.js';

const TERMINAL_STATUSES = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
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

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.findOrderOrThrow(id);
    this.assertOwnership(order, user);
    const items = await this.orderItemRepo.find({ where: { orderId: id } });
    return { ...order, items };
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateOrderAddressDto): Promise<Order> {
    const order = await this.findOrderOrThrow(id);
    this.assertOwnership(order, user);
    this.assertPendingForEdit(order);
    Object.assign(order, dto);
    return this.orderRepo.save(order);
  }

  async cancel(id: string, user: AuthenticatedUser): Promise<Order> {
    const order = await this.findOrderOrThrow(id);
    this.assertOwnership(order, user);
    this.assertPendingForEdit(order);

    await this.orderRepo.manager.transaction(async (manager) => {
      const items = await manager.getRepository(OrderItem).find({ where: { orderId: id } });
      for (const item of items) {
        await manager
          .getRepository(Product)
          .increment({ id: item.productId }, 'stock', item.quantity);
      }
      order.status = OrderStatus.CANCELLED;
      await manager.getRepository(Order).save(order);
    });

    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOrderOrThrow(id);
    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Cannot change status of a ${order.status} order`);
    }

    order.status = status;
    await this.orderRepo.save(order);
    return order;
  }

  async checkout(userId: string, dto: CreateOrderDto): Promise<Order> {
    const cartItems = await this.cartService.findForUser(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.orderRepo.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const orderItemRepo = manager.getRepository(OrderItem);

      let subtotal = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const cartItem of cartItems) {
        const product = await productRepo.findOne({
          where: { id: cartItem.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) {
          throw new BadRequestException('A product in your cart is no longer available');
        }
        if (product.stock < cartItem.quantity) {
          throw new BadRequestException(`Insufficient stock for "${product.name}"`);
        }

        product.stock -= cartItem.quantity;
        await productRepo.save(product);

        const unitPrice = Number(product.price);
        subtotal += unitPrice * cartItem.quantity;
        orderItems.push({
          productId: cartItem.productId,
          productName: product.name,
          productImageUrl: product.images[0] ?? null,
          quantity: cartItem.quantity,
          unitPrice: unitPrice.toFixed(2),
        });
      }

      let discountAmount = 0;
      if (dto.couponCode) {
        const result = await this.couponsService.applyCoupon(dto.couponCode, subtotal);
        discountAmount = result.discountAmount;
      }

      const taxAmount = Number(((subtotal - discountAmount) * VAT_RATE).toFixed(2));
      const total = subtotal - discountAmount + taxAmount;

      const order = manager.getRepository(Order).create({
        userId,
        recipientName: dto.recipientName,
        phoneNumber: dto.phoneNumber,
        city: dto.city,
        district: dto.district,
        ward: dto.ward,
        streetAddress: dto.streetAddress,
        paymentMethod: dto.paymentMethod,
        couponCode: dto.couponCode ?? null,
        discountAmount: discountAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
      });
      await manager.getRepository(Order).save(order);

      for (const item of orderItems) {
        await orderItemRepo.save(orderItemRepo.create({ ...item, orderId: order.id }));
      }

      await manager.getRepository(CartItem).delete({ userId });
      await manager.getRepository(User).update({ id: userId }, { phoneNumber: dto.phoneNumber });

      return order;
    });
  }

  private async findOrderOrThrow(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private assertOwnership(order: Order, user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN && order.userId !== user.sub) {
      throw new ForbiddenException('Not your order');
    }
  }

  private assertPendingForEdit(order: Order): void {
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order can only be modified while pending');
    }
  }
}
