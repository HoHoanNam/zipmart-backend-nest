import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor.js';
import { AuditLog } from './audit-log.entity.js';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';

/**
 * Registers `AuditInterceptor` as a global `APP_INTERCEPTOR` from within
 * this feature module — same "global enhancer declared where its
 * dependencies live" pattern as `ThrottlerGuard`'s `APP_GUARD` in
 * `app.module.ts`, just delegated here because this one needs
 * `TypeOrmModule.forFeature([AuditLog])` in scope to inject the repository.
 * Nest applies it app-wide regardless of which module declared it, as long
 * as this module is part of the graph (it's imported into `AppModule`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AuditModule {}
