import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { PaymentMethod } from '../order.entity.js';

export class UpdateOrderAddressDto {
  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s]{8,15}$/, { message: 'phoneNumber must be a valid phone number' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
