import { IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class VariantDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsInt()
  @Min(0)
  stock!: number;
}
