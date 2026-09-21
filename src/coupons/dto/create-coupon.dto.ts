import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
