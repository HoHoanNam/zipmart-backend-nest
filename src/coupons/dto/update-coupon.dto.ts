import { IsBoolean, IsDateString, IsInt, IsNumber, Max, Min, IsOptional } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** Explicit `null` clears the expiry (coupon never expires again). */
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number | null;
}
