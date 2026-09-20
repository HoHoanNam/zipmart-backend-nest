import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsModule } from '../products/products.module.js';
import { UploadsCleanupJob } from './uploads-cleanup.job.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  imports: [AuthModule, ProductsModule],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsCleanupJob],
})
export class UploadsModule {}
