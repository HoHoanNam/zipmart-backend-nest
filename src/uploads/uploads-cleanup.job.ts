import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service.js';
import { UploadsService } from './uploads.service.js';

/** Avoids deleting an image an admin just uploaded but hasn't saved yet. */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UploadsCleanupJob {
  private readonly logger = new Logger(UploadsCleanupJob.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly productsService: ProductsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedImages(): Promise<void> {
    try {
      const imageUrls = await this.productsService.findAllImageUrls();
      const referenced = new Set(
        imageUrls
          .map((url) => this.uploadsService.extractPublicId(url))
          .filter((publicId): publicId is string => publicId !== null),
      );

      const assets = await this.uploadsService.listAllPublicIds();
      const cutoff = Date.now() - GRACE_PERIOD_MS;
      const orphanIds = assets
        .filter((asset) => !referenced.has(asset.publicId) && asset.createdAt.getTime() < cutoff)
        .map((asset) => asset.publicId);

      if (orphanIds.length === 0) {
        this.logger.log('No orphaned product images to clean up.');
        return;
      }

      await this.uploadsService.deleteImages(orphanIds);
      this.logger.log(`Deleted ${orphanIds.length} orphaned product image(s) from Cloudinary.`);
    } catch (error) {
      this.logger.error('Failed to clean up orphaned product images', error as Error);
    }
  }
}
