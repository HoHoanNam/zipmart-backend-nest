import { Inject, Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Redis } from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { UserRole } from '../auth/user.entity.js';
import { REDIS_CLIENT } from '../redis/redis.provider.js';
import { WsJwtGuard, type WsAuthenticatedUser } from './ws-jwt.guard.js';

/** Refreshed on every connect; a value simply expiring means "not seen recently", not a hard disconnect signal — good enough for a presence indicator. */
const PRESENCE_TTL_SECONDS = 120;

export const ADMIN_SUPPORT_ROOM = 'admin:support';
export const userRoom = (userId: string): string => `user:${userId}`;
export const supportConversationRoom = (conversationId: string): string => `support:${conversationId}`;

/**
 * Single shared gateway for every realtime feature (A.7 chat, A.8
 * notifications, B.9 support console) — one namespace (`/ws`), rooms
 * distinguish audiences rather than separate gateways/namespaces per
 * feature. `RealtimeGateway.emitToUser()` etc. are called by other modules
 * (support, notifications) as plain injected-service methods; this class
 * has no HTTP surface of its own.
 */
@WebSocketGateway({ namespace: '/ws', cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const user = this.wsJwtGuard.verifyClient(client);
    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    await client.join(userRoom(user.sub));
    if (user.role === UserRole.ADMIN) {
      await client.join(ADMIN_SUPPORT_ROOM);
    }
    await this.redis.set(`ws:presence:${user.sub}`, '1', 'EX', PRESENCE_TTL_SECONDS);
    this.logger.debug(`Socket connected for user ${user.sub}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as WsAuthenticatedUser | undefined;
    if (!user) return;
    // Best-effort — another tab/device for the same user may still be
    // connected, but presence here is a "seen recently" signal, not a
    // strict connection counter, so clearing on any disconnect is fine (it
    // gets re-set on the next connect).
    await this.redis.del(`ws:presence:${user.sub}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:join')
  async joinSupportConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await client.join(supportConversationRoom(data.conversationId));
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:leave')
  async leaveSupportConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    await client.leave(supportConversationRoom(data.conversationId));
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  emitToSupportConversation(conversationId: string, event: string, payload: unknown): void {
    this.server.to(supportConversationRoom(conversationId)).emit(event, payload);
  }

  emitToAdminSupport(event: string, payload: unknown): void {
    this.server.to(ADMIN_SUPPORT_ROOM).emit(event, payload);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const value = await this.redis.get(`ws:presence:${userId}`);
    return value !== null;
  }
}
