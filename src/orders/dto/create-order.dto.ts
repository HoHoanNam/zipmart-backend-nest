import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';
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

  /** Loyalty points to redeem against this order's total — see `LoyaltyService.redeemInTransaction()`. */
  @IsOptional()
  @IsInt()
  @Min(1)
  redeemPoints?: number;
}
