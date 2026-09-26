import { IsOptional, IsUrl } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
