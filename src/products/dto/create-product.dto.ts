import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { VariantDto } from './variant.dto.js';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsUUID()
  categoryId!: string;

  /** Normalized to uppercase so "Levi's"/"LEVI'S"/"levi's" all dedupe to 1 brand for filtering. */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  brand?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  /** Shape depends on `categoryId` — validated in ProductsService, not here. */
  @IsObject()
  attributes!: Record<string, unknown>;

  @IsNumberString()
  price!: string;

  @IsOptional()
  @IsNumberString()
  originalPrice?: string;

  @IsInt()
  @Min(0)
  stock!: number;

  /** When present, this product uses real per-variant price/stock — see products.service.ts. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
