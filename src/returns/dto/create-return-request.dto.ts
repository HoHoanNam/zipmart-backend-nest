import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ReturnReason } from '../return-request.entity.js';

export class CreateReturnRequestDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  orderItemId!: string;

  @IsEnum(ReturnReason)
  reason!: ReturnReason;

  @IsOptional()
  @IsString()
  note?: string;
}
