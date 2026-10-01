import { Injectable, Logger, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { AuditLog } from '../../audit/audit-log.entity.js';
import { AUDIT_KEY } from '../decorators/audit.decorator.js';

/** Never persisted as-is — a request body containing any of these keys gets that key's value replaced with `'[REDACTED]'` before the row is written. */
const SENSITIVE_BODY_FIELDS = ['password', 'newPassword', 'currentPassword', 'token', 'refreshToken'];

/**
 * Global interceptor (registered via `APP_INTERCEPTOR` in `AuditModule`,
 * the same enhancer-from-a-feature-module pattern as `ThrottlerGuard`'s
 * `APP_GUARD` in `app.module.ts`) — but it's a no-op for every handler
 * except the ones explicitly tagged `@Audit('...')`. Only fires on a
 * successful response (`tap`, not also wired to the error path) — this is
 * an activity trail for admin mutations, not a full request/error log.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.getAllAndOverride<string | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!entityType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap((responseBody: unknown) => {
        const response = context.switchToHttp().getResponse();
        // Fire-and-forget — writing the audit row must never delay or
        // fail the response it's observing.
        void this.record(entityType, request, response.statusCode, responseBody);
      }),
    );
  }

  private async record(
    entityType: string,
    request: { params?: Record<string, string>; user?: { sub?: string }; method: string; originalUrl?: string; url: string; body?: unknown },
    statusCode: number,
    responseBody: unknown,
  ): Promise<void> {
    try {
      const entityId =
        request.params?.id ?? (responseBody as { id?: string } | undefined)?.id ?? null;
      await this.auditLogRepo.save(
        this.auditLogRepo.create({
          userId: request.user?.sub ?? null,
          entityType,
          entityId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode,
          requestBody: this.sanitizeBody(request.body),
        }),
      );
    } catch (error) {
      this.logger.error('Failed to write audit log', error as Error);
    }
  }

  private sanitizeBody(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;
    const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    for (const field of SENSITIVE_BODY_FIELDS) {
      if (field in clone) clone[field] = '[REDACTED]';
    }
    return clone;
  }
}
