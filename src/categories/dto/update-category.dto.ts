import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

/** No `slug` field — kept immutable after creation, see `create-category.dto.ts`. */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
