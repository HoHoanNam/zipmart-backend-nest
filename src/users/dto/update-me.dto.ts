import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
