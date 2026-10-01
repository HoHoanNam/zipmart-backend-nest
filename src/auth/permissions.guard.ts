import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.provider.js';
import { PERMISSIONS_KEY } from '../common/decorators/require-permission.decorator.js';
import { PermissionsService } from './permissions.service.js';

const CACHE_TTL_SECONDS = 300;

/**
 * Real enforcement point for the new permission-based RBAC — parallel to
 * `RolesGuard`, not a replacement for it yet (controllers migrate one at a
 * time). Caches a role's permission-key set in Redis so revoking a
 * permission takes effect on the role's next request, not just next login
 * (the JWT itself only carries `role`/`sub`, never permission keys).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roleId) {
      return false;
    }

    const granted = await this.getPermissionKeys(user.roleId);
    return required.every((key) => granted.has(key));
  }

  private async getPermissionKeys(roleId: string): Promise<Set<string>> {
    const cacheKey = `perms:${roleId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return new Set(JSON.parse(cached) as string[]);
    }

    const keys = await this.permissionsService.getPermissionKeysForRole(roleId);
    await this.redis.set(cacheKey, JSON.stringify(keys), 'EX', CACHE_TTL_SECONDS);
    return new Set(keys);
  }
}
