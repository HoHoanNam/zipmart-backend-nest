import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ProductsService } from '../products/products.service.js';
import { RecProxyService } from './rec-proxy.service.js';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecController {
  constructor(
    private readonly recProxyService: RecProxyService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async getRecommendations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit = 10,
  ) {
    const { items, coldStart } = await this.recProxyService.getRecommendations(
      user.sub,
      Number(limit),
    );

    const enriched = await Promise.all(
      items.map(async (item) => ({
        ...item,
        product: await this.productsService.findOne(item.productId),
      })),
    );

    return { items: enriched, coldStart };
  }
}
