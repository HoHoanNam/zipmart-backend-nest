import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApparelGender {
  NAM = 'nam',
  NU = 'nu',
  UNISEX = 'unisex',
}

export class ApparelAttributesDto {
  @IsString()
  size!: string;

  @IsString()
  color!: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsEnum(ApparelGender)
  gender?: ApparelGender;
}
