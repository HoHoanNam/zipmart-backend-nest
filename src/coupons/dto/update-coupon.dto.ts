import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
