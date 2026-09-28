import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { ProductVariant } from './product-variant.entity.js';
import { Product } from './product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { StockMovement } from './stock-movement.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, StockMovement]),
    AuthModule,
    CategoriesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
