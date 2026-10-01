import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway.js';
import { WsJwtGuard } from './ws-jwt.guard.js';

/**
 * Own `JwtModule.registerAsync` (not `AuthModule`) — `AuthModule` exports
 * `PassportModule`/`JwtStrategy` for the HTTP `JwtAuthGuard` path, which
 * `WsJwtGuard` deliberately doesn't use (Socket.IO handshakes have no
 * `Authorization` header for Passport's extractor to read). Only the raw
 * `JwtService` (same secret) is needed here.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RealtimeGateway, WsJwtGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
