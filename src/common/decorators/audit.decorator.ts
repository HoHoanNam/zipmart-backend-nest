import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_entity_type';

/** Tags a handler for `AuditInterceptor` to log on success — `@Audit('product')` on `ProductsController.create()`, for example. Absent on a handler = not audited (opt-in, not global-by-default, so read-only `GET` handlers stay untouched). */
export const Audit = (entityType: string) => SetMetadata(AUDIT_KEY, entityType);
