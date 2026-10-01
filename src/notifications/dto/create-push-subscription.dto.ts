import { IsString } from 'class-validator';

/** Shape mirrors the browser's `PushSubscription.toJSON()` output. */
export class CreatePushSubscriptionDto {
  @IsString()
  endpoint!: string;

  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}
