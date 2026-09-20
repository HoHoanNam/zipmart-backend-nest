import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class DimensionsCmDto {
  @IsNumber()
  @Min(0)
  length!: number;

  @IsNumber()
  @Min(0)
  width!: number;

  @IsNumber()
  @Min(0)
  height!: number;
}

export class HouseholdAttributesDto {
  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  color?: string;

  /** Free-text on purpose — e.g. "2L", "5kg", not always a plain number. */
  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsCmDto)
  dimensionsCm?: DimensionsCmDto;
}
