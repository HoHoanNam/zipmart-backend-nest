import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PaymentMethod } from '../order.entity.js';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @IsString()
  @Matches(/^[0-9+\-\s]{8,15}$/, { message: 'phoneNumber must be a valid phone number' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsNotEmpty()
  ward!: string;

  @IsString()
  @IsNotEmpty()
  streetAddress!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
