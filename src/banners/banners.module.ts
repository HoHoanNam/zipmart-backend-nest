import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Banner } from './banner.entity.js';
import { BannersController } from './banners.controller.js';
import { BannersService } from './banners.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Banner]), AuthModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
