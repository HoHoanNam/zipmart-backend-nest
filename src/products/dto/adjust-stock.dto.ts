import { IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  /** Positive = add stock, negative = remove stock. */
  @IsInt()
  @NotEquals(0)
  change!: number;

  @IsString()
  @MinLength(1)
  reason!: string;
}
