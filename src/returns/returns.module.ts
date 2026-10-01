import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrderItem } from '../orders/order-item.entity.js';
import { Order } from '../orders/order.entity.js';
import { Payment } from '../payments/payment.entity.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { ReturnRequest } from './return-request.entity.js';
import { ReturnsController } from './returns.controller.js';
import { ReturnsService } from './returns.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRequest, Order, OrderItem, Payment]),
    AuthModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
