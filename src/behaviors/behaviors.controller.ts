import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { BehaviorService } from './behavior.service.js';
import { TrackBehaviorDto } from './dto/track-behavior.dto.js';

@ApiTags('behaviors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('behaviors')
export class BehaviorsController {
  constructor(private readonly behaviorService: BehaviorService) {}

  // Rate limited separately from the global default: tracking traffic is
  // high-volume (fired on every view/click) and must not starve other routes.
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post()
  track(@CurrentUser() user: AuthenticatedUser, @Body() dto: TrackBehaviorDto) {
    return this.behaviorService.track(user.sub, dto.productId, dto.eventType);
  }
}
