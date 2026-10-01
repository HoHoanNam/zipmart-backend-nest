import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from './user.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';
import { PermissionsService } from './permissions.service.js';

/** Gated with the OLD `RolesGuard`/`UserRole.ADMIN` on purpose — the new permission system isn't trustworthy to guard itself until every role is seeded, so bootstrapping role/permission management stays on the pre-existing binary admin check. */
@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('permissions')
  findAllPermissions() {
    return this.permissionsService.findAllPermissions();
  }

  @Get('roles')
  findAllRoles() {
    return this.permissionsService.findAllRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.permissionsService.createRole(dto);
  }

  @Patch('roles/:id/permissions')
  updateRolePermissions(@Param('id') id: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.permissionsService.updateRolePermissions(id, dto.permissionKeys);
  }
}
