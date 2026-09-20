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
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
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

  @IsInt()
  @Min(0)
  stock!: number;
}
