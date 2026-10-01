import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Product } from '../products/product.entity.js';
import { BulkImportJob } from './bulk-import-job.entity.js';
import { ProductsImportController } from './products-import.controller.js';
import { ProductsImportService } from './products-import.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BulkImportJob, Product]), AuthModule],
  controllers: [ProductsImportController],
  providers: [ProductsImportService],
})
export class ProductsImportModule {}
