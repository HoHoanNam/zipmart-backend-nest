import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { Audit } from '../common/decorators/audit.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { UpdateLowStockThresholdDto } from './dto/update-low-stock-threshold.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('brands')
  findDistinctBrands(@Query('categoryId') categoryId?: string) {
    return this.productsService.findDistinctBrands(categoryId);
  }

  @Get('suggest')
  suggest(@Query('q') q?: string) {
    return this.productsService.suggest(q ?? '');
  }

  /** Must stay above `:id` — otherwise `GET /products/compare` would match the `:id` route with `id="compare"`. */
  @Get('compare')
  findManyForCompare(@Query('ids') ids?: string) {
    const idList = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    return this.productsService.findManyForCompare(idList);
  }

  /** Also above `:id` for the same reason as `compare`/`brands`/`suggest`. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/stock-adjust')
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.productsService.adjustStock(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/stock-movements')
  findStockMovements(@Param('id') id: string) {
    return this.productsService.findStockMovements(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/low-stock-threshold')
  updateLowStockThreshold(@Param('id') id: string, @Body() dto: UpdateLowStockThresholdDto) {
    return this.productsService.updateLowStockThreshold(id, dto);
  }

  /** `@Audit('product')` proof-of-concept for B.3 — see AuditModule/AuditInterceptor. Not retrofitted onto every mutation handler in this controller yet (see the task's final report for which ones are tagged and which aren't). */
  @Audit('product')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
