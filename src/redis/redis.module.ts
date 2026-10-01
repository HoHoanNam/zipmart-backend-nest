import { Global, Module } from '@nestjs/common';
import { redisProvider } from './redis.provider.js';

/**
 * Global so any feature module can `@Inject(REDIS_CLIENT)` without importing
 * this module explicitly — mirrors the single shared connection every
 * consumer (recommendations cache, permissions cache, settings cache, ws
 * presence) was already implicitly relying on before this was extracted.
 */
@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
