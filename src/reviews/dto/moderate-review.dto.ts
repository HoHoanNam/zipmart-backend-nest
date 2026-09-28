import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ModerateReviewDto {
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  /** Empty string clears an existing reply. */
  @IsOptional()
  @IsString()
  adminReply?: string;
}
