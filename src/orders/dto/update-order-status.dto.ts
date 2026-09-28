import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.entity.js';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
