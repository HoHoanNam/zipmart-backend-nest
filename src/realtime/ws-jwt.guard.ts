import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

export interface WsAuthenticatedUser {
  sub: string;
  role: string;
  roleId: string | null;
}

/**
 * WS-context counterpart of `JwtAuthGuard` — a Socket.IO handshake doesn't
 * carry an `Authorization` header the way Passport's `JwtAuthGuard` expects,
 * so this verifies the same access token (same secret, same payload shape
 * as `JwtStrategy.validate()`) from `handshake.auth.token` instead. Used
 * both directly in `RealtimeGateway.handleConnection()` (reject/disconnect
 * unauthenticated sockets up front) and via `@UseGuards(WsJwtGuard)` on
 * individual `@SubscribeMessage` handlers.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const user = this.verifyClient(client);
    if (!user) {
      throw new UnauthorizedException('Invalid or missing token');
    }
    client.data.user = user;
    return true;
  }

  /** Non-throwing variant for `handleConnection()`, which needs to disconnect rather than propagate a WsException. */
  verifyClient(client: Socket): WsAuthenticatedUser | null {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string; role: string; roleId: string | null }>(
        token,
        { secret: this.configService.get<string>('JWT_ACCESS_SECRET') },
      );
      return { sub: payload.sub, role: payload.role, roleId: payload.roleId ?? null };
    } catch {
      return null;
    }
  }
}
