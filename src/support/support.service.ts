import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../auth/user.entity.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { CreateConversationDto } from './dto/create-conversation.dto.js';
import type { PostMessageDto } from './dto/post-message.dto.js';
import { SupportConversation, SupportConversationStatus } from './support-conversation.entity.js';
import { SupportMessage } from './support-message.entity.js';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportConversation)
    private readonly conversationRepo: Repository<SupportConversation>,
    @InjectRepository(SupportMessage) private readonly messageRepo: Repository<SupportMessage>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto): Promise<SupportConversation> {
    const conversation = await this.conversationRepo.save(
      this.conversationRepo.create({ userId }),
    );
    await this.saveAndBroadcastMessage(conversation, userId, false, dto.message);
    return conversation;
  }

  findForUser(userId: string): Promise<SupportConversation[]> {
    return this.conversationRepo.find({ where: { userId }, order: { lastMessageAt: 'DESC' } });
  }

  findAll(): Promise<SupportConversation[]> {
    return this.conversationRepo.find({ order: { lastMessageAt: 'DESC' } });
  }

  async findMessages(conversationId: string, user: AuthenticatedUser): Promise<SupportMessage[]> {
    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertCanAccess(conversation, user);
    return this.messageRepo.find({ where: { conversationId }, order: { createdAt: 'ASC' } });
  }

  /** Both sides (customer and support staff) post through this — `fromAdmin` is derived from the caller's own role, never client-supplied. */
  async postMessage(
    conversationId: string,
    user: AuthenticatedUser,
    dto: PostMessageDto,
  ): Promise<SupportMessage> {
    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertCanAccess(conversation, user);
    if (conversation.status === SupportConversationStatus.CLOSED) {
      throw new BadRequestException('Cuộc trò chuyện này đã đóng');
    }

    const fromAdmin = user.role === UserRole.ADMIN;
    return this.saveAndBroadcastMessage(conversation, user.sub, fromAdmin, dto.body);
  }

  async assign(conversationId: string, adminUserId: string): Promise<SupportConversation> {
    const conversation = await this.findConversationOrThrow(conversationId);
    conversation.assignedAdminId = adminUserId;
    await this.conversationRepo.save(conversation);
    this.realtimeGateway.emitToAdminSupport('support:conversation-updated', { conversationId });
    return conversation;
  }

  async close(conversationId: string, user: AuthenticatedUser): Promise<SupportConversation> {
    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertCanAccess(conversation, user);
    conversation.status = SupportConversationStatus.CLOSED;
    await this.conversationRepo.save(conversation);

    this.realtimeGateway.emitToSupportConversation(conversationId, 'support:conversation-closed', {
      conversationId,
    });
    this.realtimeGateway.emitToUser(conversation.userId, 'support:conversation-closed', { conversationId });
    this.realtimeGateway.emitToAdminSupport('support:conversation-closed', { conversationId });
    return conversation;
  }

  private async saveAndBroadcastMessage(
    conversation: SupportConversation,
    senderUserId: string,
    fromAdmin: boolean,
    body: string,
  ): Promise<SupportMessage> {
    const message = await this.messageRepo.save(
      this.messageRepo.create({ conversationId: conversation.id, senderUserId, fromAdmin, body }),
    );
    // Bumps `lastMessageAt` via `@UpdateDateColumn` — keeps the admin
    // conversation list sortable by recent activity without a join.
    await this.conversationRepo.save(conversation);

    this.realtimeGateway.emitToSupportConversation(conversation.id, 'support:message', message);
    if (fromAdmin) {
      this.realtimeGateway.emitToUser(conversation.userId, 'support:message', message);
    } else {
      this.realtimeGateway.emitToAdminSupport('support:message', message);
    }
    return message;
  }

  private async findConversationOrThrow(id: string): Promise<SupportConversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private assertCanAccess(conversation: SupportConversation, user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN && conversation.userId !== user.sub) {
      throw new ForbiddenException('Not your conversation');
    }
  }
}
