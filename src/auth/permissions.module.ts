import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth.module.js';
import { Permission } from './permission.entity.js';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsGuard } from './permissions.guard.js';
import { PermissionsService } from './permissions.service.js';
import { RolePermission } from './role-permission.entity.js';
import { Role } from './role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission]), AuthModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
