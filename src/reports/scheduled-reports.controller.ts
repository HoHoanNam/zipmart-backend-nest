import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto.js';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto.js';
import { ScheduledReportsService } from './scheduled-reports.service.js';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports/scheduled')
export class ScheduledReportsController {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Get()
  findAll() {
    return this.scheduledReportsService.findAll();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduledReportDto) {
    return this.scheduledReportsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduledReportDto) {
    return this.scheduledReportsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduledReportsService.remove(id);
  }

  /** Not in the original endpoint list — a "run now" action for testing a report's content/recipients without waiting for its cron schedule. */
  @Post(':id/run')
  runNow(@Param('id') id: string) {
    return this.scheduledReportsService.runReport(id);
  }
}
