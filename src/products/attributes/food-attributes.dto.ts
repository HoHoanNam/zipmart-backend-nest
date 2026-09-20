import { IsArray, IsOptional, IsString } from 'class-validator';

export class FoodAttributesDto {
  /** Free-text on purpose — e.g. "500g", "1L", not always a plain number. */
  @IsString()
  netWeight!: string;

  @IsOptional()
  @IsString()
  ingredients?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  storageInstructions?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}
