import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findForUser(user.sub);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.checkout(user.sub);
  }
}
