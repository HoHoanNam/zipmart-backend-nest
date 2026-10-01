import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/user.entity.js';
import { BehaviorEvent } from '../behaviors/behavior.entity.js';
import { Order } from '../orders/order.entity.js';
import { Product } from '../products/product.entity.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, User, BehaviorEvent]), AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  // Exported for B.10's ScheduledReportsModule, which reuses
  // `getRevenueReport()`/`getTopProducts()`/`exportOrdersCsv()` to build
  // the emailed report body instead of duplicating that querying logic.
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
