import { IsEnum } from 'class-validator';
import { UserRole } from '../../auth/user.entity.js';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
