import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { PostMessageDto } from './dto/post-message.dto.js';
import { SupportService } from './support.service.js';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support/conversations')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateConversationDto) {
    return this.supportService.createConversation(user.sub, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.findForUser(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.supportService.findAll();
  }

  @Get(':id/messages')
  findMessages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.findMessages(id, user);
  }

  /** Not in the original Infra H endpoint list, but required for the chat to actually function — `GET .../messages` alone has no way to add a new message. Both the customer and support staff post through this; `SupportService.postMessage()` derives `fromAdmin` from the caller's own role. */
  @Post(':id/messages')
  postMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PostMessageDto,
  ) {
    return this.supportService.postMessage(id, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.assign(id, user.sub);
  }

  /** Either side can close — the customer ending their own chat, or support staff wrapping it up. `SupportService.close()` enforces ownership/admin. */
  @Patch(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supportService.close(id, user);
  }
}
