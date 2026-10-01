import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ScheduledReportType } from '../scheduled-report.entity.js';

export class CreateScheduledReportDto {
  @IsString()
  name!: string;

  @IsEnum(ScheduledReportType)
  reportType!: ScheduledReportType;

  @IsString()
  cronExpression!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  recipientEmails!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
