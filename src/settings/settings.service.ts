import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.provider.js';
import type { UpdateSettingDto } from './dto/update-setting.dto.js';
import { Setting } from './setting.entity.js';

const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_PREFIX = 'setting:';

/** Fallback used only if the `vat_rate` row is ever missing (e.g. a fresh DB before the seed migration ran) — the source of truth is the `settings` table once seeded, not this constant. */
const DEFAULT_VAT_RATE = 0.08;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settingRepo: Repository<Setting>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  findAll(): Promise<Setting[]> {
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }

  async update(key: string, dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    setting.value = dto.value;
    const saved = await this.settingRepo.save(setting);
    await this.redis.del(`${CACHE_KEY_PREFIX}${key}`);
    return saved;
  }

  /** Cached read used by other modules (e.g. `OrdersService.checkout()` for `vat_rate`) — same Redis-cache-with-TTL shape as `PermissionsGuard`'s `perms:{roleId}`. */
  async getValue<T>(key: string, fallback: T): Promise<T> {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    const setting = await this.settingRepo.findOne({ where: { key } });
    const value = setting ? (setting.value as T) : fallback;
    await this.redis.set(cacheKey, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    return value;
  }

  getVatRate(): Promise<number> {
    return this.getValue<number>('vat_rate', DEFAULT_VAT_RATE);
  }
}
