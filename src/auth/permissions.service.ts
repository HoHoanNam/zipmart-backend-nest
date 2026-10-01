import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { In, Repository } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.provider.js';
import { Permission } from './permission.entity.js';
import { RolePermission } from './role-permission.entity.js';
import { Role } from './role.entity.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';

export interface RoleWithPermissions {
  id: string;
  name: string;
  isSystem: boolean;
  permissionKeys: string[];
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissionRepo: Repository<RolePermission>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { key: 'ASC' } });
  }

  async findAllRoles(): Promise<RoleWithPermissions[]> {
    const roles = await this.roleRepo.find({ order: { createdAt: 'ASC' } });
    const links = await this.rolePermissionRepo.find();
    const permissions = await this.permissionRepo.find();
    const keyById = new Map(permissions.map((p) => [p.id, p.key]));

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissionKeys: links
        .filter((link) => link.roleId === role.id)
        .map((link) => keyById.get(link.permissionId))
        .filter((key): key is string => Boolean(key)),
    }));
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Role name already exists');
    }
    return this.roleRepo.save(this.roleRepo.create({ name: dto.name }));
  }

  async updateRolePermissions(roleId: string, permissionKeys: string[]): Promise<RoleWithPermissions> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('Không thể sửa quyền của vai trò hệ thống (Super Admin/Customer)');
    }

    const permissions = await this.permissionRepo.find({ where: { key: In(permissionKeys) } });
    if (permissions.length !== permissionKeys.length) {
      throw new BadRequestException('One or more permission keys are invalid');
    }

    await this.rolePermissionRepo.delete({ roleId });
    await this.rolePermissionRepo.save(
      permissions.map((permission) => this.rolePermissionRepo.create({ roleId, permissionId: permission.id })),
    );
    await this.redis.del(`perms:${roleId}`);

    return { id: role.id, name: role.name, isSystem: role.isSystem, permissionKeys };
  }

  async getPermissionKeysForRole(roleId: string): Promise<string[]> {
    const links = await this.rolePermissionRepo.find({ where: { roleId } });
    if (links.length === 0) return [];
    const permissions = await this.permissionRepo.find({ where: { id: In(links.map((l) => l.permissionId)) } });
    return permissions.map((p) => p.key);
  }
}
