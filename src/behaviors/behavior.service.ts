import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehaviorEvent, type BehaviorEventType } from './behavior.entity.js';
import { EVENT_WEIGHT } from './constants.js';

@Injectable()
export class BehaviorService {
  constructor(
    @InjectRepository(BehaviorEvent) private readonly behaviorRepo: Repository<BehaviorEvent>,
  ) {}

  track(userId: string, productId: string, eventType: BehaviorEventType) {
    const event = this.behaviorRepo.create({
      userId,
      productId,
      eventType,
      eventWeight: EVENT_WEIGHT[eventType],
      occurredAt: new Date(),
    });
    return this.behaviorRepo.save(event);
  }
}
