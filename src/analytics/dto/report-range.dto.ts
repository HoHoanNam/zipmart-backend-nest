import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type RevenueGroupBy = 'day' | 'week' | 'month';

const GROUP_BY_OPTIONS: RevenueGroupBy[] = ['day', 'week', 'month'];

/** `from`/`to` are inclusive calendar dates (YYYY-MM-DD) — defaults to the trailing 30 days when omitted. */
export class ReportRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TopProductsQueryDto extends ReportRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** B.6 — chart granularity for `getRevenueReport()`. Defaults to `'day'` (the original behavior) when omitted. */
export class RevenueReportQueryDto extends ReportRangeDto {
  @IsOptional()
  @IsIn(GROUP_BY_OPTIONS)
  groupBy?: RevenueGroupBy;
}
