import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @IsString()
  @Matches(/^[0-9+\-\s]{8,15}$/, { message: 'phoneNumber must be a valid phone number' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsNotEmpty()
  ward!: string;

  @IsString()
  @IsNotEmpty()
  streetAddress!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
