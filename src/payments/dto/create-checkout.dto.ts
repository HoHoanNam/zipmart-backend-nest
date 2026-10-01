import { IsEnum, IsUUID } from 'class-validator';
import { PaymentGateway } from '../payment.entity.js';

export class CreateCheckoutDto {
  @IsUUID()
  orderId!: string;

  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;
}
