import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { DryRunImportDto } from './dto/dry-run-import.dto.js';
import { ProductsImportService } from './products-import.service.js';

@ApiTags('products-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('products/import')
export class ProductsImportController {
  constructor(private readonly productsImportService: ProductsImportService) {}

  @Post('dry-run')
  dryRun(@CurrentUser() user: AuthenticatedUser, @Body() dto: DryRunImportDto) {
    return this.productsImportService.dryRun(user.sub, dto.csv);
  }

  @Get(':jobId')
  findOne(@Param('jobId') jobId: string) {
    return this.productsImportService.findOne(jobId);
  }

  @Post(':jobId/commit')
  commit(@Param('jobId') jobId: string) {
    return this.productsImportService.commit(jobId);
  }
}
