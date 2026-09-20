import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ProductsService } from '../products/products.service.js';
import { REDIS_CLIENT } from './redis.provider.js';

export interface RecommendationItem {
  productId: string;
  score: number;
  reason: string;
}

export interface RecommendationResult {
  items: RecommendationItem[];
  coldStart: boolean;
}

const CACHE_TTL_SECONDS = 30 * 60;

@Injectable()
export class RecProxyService {
  private readonly logger = new Logger(RecProxyService.name);
  private readonly backendSpringUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.backendSpringUrl = this.configService.get<string>(
      'BACKEND_SPRING_URL',
      'http://localhost:8080',
    );
  }

  async getRecommendations(userId: string, limit: number): Promise<RecommendationResult> {
    // Keyed by limit too — callers on the same page (e.g. the product grid
    // and the sidebar teaser) request different limits concurrently, and a
    // shared `rec:{userId}` key would let whichever call lands first in
    // cache silently truncate the other's result.
    const cacheKey = `rec:${userId}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as RecommendationResult;
    }

    const items = await this.fetchFromSpring(userId, limit);
    const result: RecommendationResult =
      items.length > 0
        ? { items, coldStart: false }
        : { items: await this.buildColdStartFallback(limit), coldStart: true };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  async invalidate(userId: string) {
    const keys = await this.redis.keys(`rec:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async fetchFromSpring(userId: string, limit: number): Promise<RecommendationItem[]> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<RecommendationItem[]>(`${this.backendSpringUrl}/api/rec/${userId}`, {
          params: { limit },
        })
        .pipe(
          catchError((error) => {
            // zipmart-backend-spring not reachable/not built yet — this is the
            // expected cold-start path until that repo exists.
            this.logger.warn(`backend-spring unreachable, falling back: ${error.message}`);
            return of({ data: [] as RecommendationItem[] });
          }),
        ),
    );
    return data;
  }

  private async buildColdStartFallback(limit: number): Promise<RecommendationItem[]> {
    const topSellingIds = await this.productsService.findTopSelling(limit);
    return topSellingIds.map((productId) => ({
      productId,
      score: 0,
      reason: 'top_selling',
    }));
  }
}
