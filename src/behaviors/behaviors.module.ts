import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { BehaviorEvent } from './behavior.entity.js';
import { BehaviorService } from './behavior.service.js';
import { BehaviorsController } from './behaviors.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([BehaviorEvent]), AuthModule],
  controllers: [BehaviorsController],
  providers: [BehaviorService],
})
export class BehaviorsModule {}
