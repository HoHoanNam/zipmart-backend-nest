import { BehaviorEventType } from './behavior.entity.js';

export const EVENT_WEIGHT: Record<BehaviorEventType, number> = {
  [BehaviorEventType.VIEW]: 1,
  [BehaviorEventType.CLICK]: 2,
  [BehaviorEventType.ADD_TO_CART]: 3,
  [BehaviorEventType.PURCHASE]: 5,
};
