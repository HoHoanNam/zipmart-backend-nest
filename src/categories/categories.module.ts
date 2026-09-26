import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Category } from './category.entity.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
