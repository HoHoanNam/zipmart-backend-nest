import { IsOptional, IsString, IsUrl, Matches, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  /** Immutable after creation — `attribute-schemas.ts` looks up validation by this exact string. Auto-generated from `name` when omitted. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch ngang',
  })
  slug?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
