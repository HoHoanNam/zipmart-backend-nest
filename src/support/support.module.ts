import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { SupportConversation } from './support-conversation.entity.js';
import { SupportMessage } from './support-message.entity.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SupportConversation, SupportMessage]), AuthModule, RealtimeModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
