import { IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsNumberString()
  price!: string;

  @IsInt()
  @Min(0)
  stock!: number;
}
