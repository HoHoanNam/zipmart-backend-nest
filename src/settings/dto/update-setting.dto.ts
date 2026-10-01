import { IsDefined } from 'class-validator';

export class UpdateSettingDto {
  /** Any JSON-serializable value — shape is defined by whichever key this is (a number for `vat_rate`, a boolean for `payment_gateway_enabled`, etc.), not enforced generically here. */
  @IsDefined()
  value!: unknown;
}
