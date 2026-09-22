import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ApparelGender {
  NAM = 'nam',
  NU = 'nu',
  UNISEX = 'unisex',
}

export const APPAREL_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
// keep in sync with SIZE_OPTIONS in product-detail.ts (frontend-web)
// and products-admin.ts (admin-web)

export class ApparelAttributesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(APPAREL_SIZE_OPTIONS, { each: true })
  sizes!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  colors!: string[];

  @IsOptional()
  @IsObject()
  colorImages?: Record<string, string>; // color name -> URL in product.images

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsEnum(ApparelGender)
  gender?: ApparelGender;
}
