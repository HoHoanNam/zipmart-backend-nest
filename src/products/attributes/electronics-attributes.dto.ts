import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class ElectronicsAttributesDto {
  @IsString()
  model!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyMonths?: number;

  /** Free-form key-value for RAM/storage/screen size/... — varies too much per
   * device type to model as fixed columns. */
  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;
}
