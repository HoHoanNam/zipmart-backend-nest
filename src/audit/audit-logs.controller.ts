import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AuditLogsService } from './audit-logs.service.js';
import { QueryAuditLogDto } from './dto/query-audit-log.dto.js';

/** Gated with the same old `RolesGuard`/`UserRole.ADMIN` as the 10 pre-existing admin controllers (see the deviation note in the task's final report) rather than `@RequirePermission` — consistent with "don't touch the old controllers' guards in this task" also meaning new admin-only endpoints stay on the same pre-existing scheme for now. */
@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditLogsService.findAll(query);
  }
}
