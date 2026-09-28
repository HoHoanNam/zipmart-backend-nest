import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLowStockThresholdDto {
  /** `null`/omitted = fall back to the platform default. */
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number | null;
}
