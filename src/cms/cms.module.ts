import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CmsPageVersion } from './cms-page-version.entity.js';
import { CmsPage } from './cms-page.entity.js';
import { CmsController } from './cms.controller.js';
import { CmsService } from './cms.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([CmsPage, CmsPageVersion]), AuthModule],
  controllers: [CmsController],
  providers: [CmsService],
})
export class CmsModule {}
