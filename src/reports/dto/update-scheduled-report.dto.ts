import { PartialType } from '@nestjs/swagger';
import { CreateScheduledReportDto } from './create-scheduled-report.dto.js';

export class UpdateScheduledReportDto extends PartialType(CreateScheduledReportDto) {}
