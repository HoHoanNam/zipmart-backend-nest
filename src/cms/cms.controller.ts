import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/user.entity.js';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CmsService } from './cms.service.js';
import { CreateCmsPageVersionDto } from './dto/create-cms-page-version.dto.js';
import { CreateCmsPageDto } from './dto/create-cms-page.dto.js';

@ApiTags('cms')
@Controller('cms/pages')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  /** Public — frontend-web's static-pages feature. Only ever returns `published` pages (see `CmsService.findBySlugPublished()`). */
  @Get('by-slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.cmsService.findBySlugPublished(slug);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.cmsService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cmsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/versions')
  findVersions(@Param('id') id: string) {
    return this.cmsService.findVersions(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCmsPageDto) {
    return this.cmsService.create(user.sub, dto);
  }

  /** Creates a new immutable version and re-points the page at it — see `CmsService.createVersion()`. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  createVersion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCmsPageVersionDto,
  ) {
    return this.cmsService.createVersion(id, user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.cmsService.publish(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.cmsService.unpublish(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cmsService.remove(id);
  }
}
