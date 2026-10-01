import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/user.entity.js';
import { CartModule } from '../cart/cart.module.js';
import { CouponsModule } from '../coupons/coupons.module.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { OrderItem } from './order-item.entity.js';
import { Order } from './order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { ShipmentEvent } from './shipment-event.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, ShipmentEvent]),
    CartModule,
    CouponsModule,
    LoyaltyModule,
    NotificationsModule,
    SettingsModule,
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
