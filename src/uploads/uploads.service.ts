import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

const PRODUCT_IMAGES_FOLDER = 'zipmart/products';
const AVATAR_FOLDER = 'zipmart/avatars';

export interface UploadedImage {
  url: string;
  publicId: string;
}

export interface CloudinaryAsset {
  publicId: string;
  createdAt: Date;
}

@Injectable()
export class UploadsService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  uploadImage(buffer: Buffer): Promise<UploadedImage> {
    return this.uploadToFolder(buffer, PRODUCT_IMAGES_FOLDER);
  }

  uploadAvatar(buffer: Buffer): Promise<UploadedImage> {
    return this.uploadToFolder(buffer, AVATAR_FOLDER);
  }

  private uploadToFolder(buffer: Buffer, folder: string): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      });
      stream.end(buffer);
    });
  }

  /**
   * We don't store `publicId` in the DB — `images` stays a plain `string[]`
   * of URLs. Safe only because uploaded URLs are never rewritten with
   * transformation segments (see docs/PROJECT-CLOUDINARY-IMAGE-STORAGE.md).
   */
  extractPublicId(url: string): string | null {
    const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/.exec(url);
    return match ? match[1] : null;
  }

  async listAllPublicIds(): Promise<CloudinaryAsset[]> {
    const assets: CloudinaryAsset[] = [];
    let nextCursor: string | undefined;

    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: PRODUCT_IMAGES_FOLDER,
        max_results: 500,
        next_cursor: nextCursor,
      });
      for (const resource of result.resources) {
        assets.push({ publicId: resource.public_id, createdAt: new Date(resource.created_at) });
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);

    return assets;
  }

  async deleteImages(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;
    await cloudinary.api.delete_resources(publicIds);
  }
}
