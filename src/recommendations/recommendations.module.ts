import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsModule } from '../products/products.module.js';
import { RecController } from './rec.controller.js';
import { RecProxyService } from './rec-proxy.service.js';

@Module({
  imports: [HttpModule, ProductsModule, AuthModule],
  controllers: [RecController],
  providers: [RecProxyService],
})
export class RecommendationsModule {}
