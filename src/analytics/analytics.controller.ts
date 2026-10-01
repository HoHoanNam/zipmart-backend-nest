import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AnalyticsService } from './analytics.service.js';
import { ReportRangeDto, RevenueReportQueryDto, TopProductsQueryDto } from './dto/report-range.dto.js';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('engagement')
  getEngagement() {
    return this.analyticsService.getEngagement();
  }

  @Get('revenue-report')
  getRevenueReport(@Query() query: RevenueReportQueryDto) {
    return this.analyticsService.getRevenueReport(query);
  }

  @Get('top-products')
  getTopProducts(@Query() query: TopProductsQueryDto) {
    return this.analyticsService.getTopProducts(query);
  }

  @Get('export/orders')
  exportOrders(@Query() query: ReportRangeDto) {
    return this.analyticsService.exportOrdersCsv(query);
  }
}
