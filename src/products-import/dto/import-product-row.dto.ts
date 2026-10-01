import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/**
 * Deliberately a flat subset of `CreateProductDto` — a CSV row has no
 * sensible way to carry the category-specific `attributes` JSON or
 * per-variant price/stock, so a bulk-imported product always lands with
 * `attributes: {}`/no variants and needs a manual follow-up edit for any
 * category whose schema requires specific attributes. Documented
 * limitation, not an oversight (see `ProductsImportService.commit()`).
 */
export class ImportProductRowDto {
  @IsString()
  sku!: string;

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

  @IsNumberString()
  price!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;
}
