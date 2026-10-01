import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsPageVersion } from './cms-page-version.entity.js';
import { CmsPage, CmsPageStatus } from './cms-page.entity.js';
import type { CreateCmsPageVersionDto } from './dto/create-cms-page-version.dto.js';
import type { CreateCmsPageDto } from './dto/create-cms-page.dto.js';

export interface CmsPageWithContent extends CmsPage {
  title: string;
  content: string;
}

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(CmsPage) private readonly pageRepo: Repository<CmsPage>,
    @InjectRepository(CmsPageVersion) private readonly versionRepo: Repository<CmsPageVersion>,
  ) {}

  async create(userId: string, dto: CreateCmsPageDto): Promise<CmsPageWithContent> {
    const existing = await this.pageRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const page = await this.pageRepo.save(this.pageRepo.create({ slug: dto.slug }));
    const version = await this.versionRepo.save(
      this.versionRepo.create({
        pageId: page.id,
        title: dto.title,
        content: dto.content,
        createdByUserId: userId,
      }),
    );
    page.currentVersionId = version.id;
    await this.pageRepo.save(page);

    return { ...page, title: version.title, content: version.content };
  }

  async findAll(): Promise<CmsPageWithContent[]> {
    const pages = await this.pageRepo.find({ order: { createdAt: 'DESC' } });
    return this.withCurrentVersionContent(pages);
  }

  async findOne(id: string): Promise<CmsPageWithContent> {
    const page = await this.findPageOrThrow(id);
    const [withContent] = await this.withCurrentVersionContent([page]);
    return withContent;
  }

  /** Public — the only read path frontend-web is allowed to use; a draft page 404s exactly like a nonexistent slug so drafts can't be discovered by URL guessing. */
  async findBySlugPublished(slug: string): Promise<CmsPageWithContent> {
    const page = await this.pageRepo.findOne({ where: { slug, status: CmsPageStatus.PUBLISHED } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    const [withContent] = await this.withCurrentVersionContent([page]);
    return withContent;
  }

  findVersions(pageId: string): Promise<CmsPageVersion[]> {
    return this.versionRepo.find({ where: { pageId }, order: { createdAt: 'DESC' } });
  }

  /** Never updates the existing version row — always inserts a new immutable one and re-points `currentVersionId`. */
  async createVersion(
    pageId: string,
    userId: string,
    dto: CreateCmsPageVersionDto,
  ): Promise<CmsPageWithContent> {
    const page = await this.findPageOrThrow(pageId);
    const version = await this.versionRepo.save(
      this.versionRepo.create({ pageId, title: dto.title, content: dto.content, createdByUserId: userId }),
    );
    page.currentVersionId = version.id;
    await this.pageRepo.save(page);
    return { ...page, title: version.title, content: version.content };
  }

  async publish(id: string): Promise<CmsPage> {
    const page = await this.findPageOrThrow(id);
    page.status = CmsPageStatus.PUBLISHED;
    return this.pageRepo.save(page);
  }

  async unpublish(id: string): Promise<CmsPage> {
    const page = await this.findPageOrThrow(id);
    page.status = CmsPageStatus.DRAFT;
    return this.pageRepo.save(page);
  }

  async remove(id: string): Promise<void> {
    const page = await this.findPageOrThrow(id);
    await this.pageRepo.remove(page);
  }

  private async findPageOrThrow(id: string): Promise<CmsPage> {
    const page = await this.pageRepo.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  private async withCurrentVersionContent(pages: CmsPage[]): Promise<CmsPageWithContent[]> {
    const versionIds = pages.map((p) => p.currentVersionId).filter((id): id is string => id !== null);
    const versions = versionIds.length
      ? await this.versionRepo
          .createQueryBuilder('v')
          .where('v.id IN (:...ids)', { ids: versionIds })
          .getMany()
      : [];
    const versionById = new Map(versions.map((v) => [v.id, v]));

    return pages.map((page) => {
      const version = page.currentVersionId ? versionById.get(page.currentVersionId) : undefined;
      return { ...page, title: version?.title ?? '', content: version?.content ?? '' };
    });
  }
}
