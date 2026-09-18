import { IsEnum, IsUUID } from 'class-validator';
import { BehaviorEventType } from '../behavior.entity.js';

export class TrackBehaviorDto {
  @IsUUID()
  productId!: string;

  @IsEnum(BehaviorEventType)
  eventType!: BehaviorEventType;
}
