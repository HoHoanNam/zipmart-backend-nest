import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto, @Req() req: Request) {
    return this.paymentsService.createCheckout(dto, req.ip ?? '127.0.0.1');
  }

  /** Public — VNPay redirects the customer's browser here after payment. Signed, so the query params are self-authenticating. */
  @Get('vnpay/return')
  vnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayReturn(query);
  }

  /** Public webhook — VNPay calls this server-to-server, independent of the browser return above. */
  @Get('vnpay/ipn')
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }

  /** Public — Momo redirects the customer's browser here after payment. */
  @Get('momo/return')
  momoReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleMomoReturn(query);
  }

  /** Public webhook — Momo calls this server-to-server with a JSON body. */
  @Post('momo/ipn')
  momoIpn(@Body() body: Record<string, string>) {
    return this.paymentsService.handleMomoIpn(body);
  }
}
