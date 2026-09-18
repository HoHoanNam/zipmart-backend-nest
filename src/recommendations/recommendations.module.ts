import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsModule } from '../products/products.module.js';
import { RecController } from './rec.controller.js';
import { RecProxyService } from './rec-proxy.service.js';
import { redisProvider } from './redis.provider.js';

@Module({
  imports: [HttpModule, ProductsModule, AuthModule],
  controllers: [RecController],
  providers: [RecProxyService, redisProvider],
})
export class RecommendationsModule {}
