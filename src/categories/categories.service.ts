import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity.js';
import { Category } from './category.entity.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private readonly categoryRepo: Repository<Category>) {}

  findAll(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  findOne(id: string): Promise<Category | null> {
    return this.categoryRepo.findOne({ where: { id } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? this.slugify(dto.name);
    if (!slug) {
      throw new ConflictException('Không thể tạo slug từ tên danh mục, vui lòng nhập slug thủ công');
    }

    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Slug danh mục đã tồn tại');
    }

    const category = this.categoryRepo.create({
      name: dto.name.trim(),
      slug,
      imageUrl: dto.imageUrl ?? null,
    });
    return this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  /** Blocks deletion instead of soft-deleting — simpler than adding an `isActive` column, and `Product.categoryId` has no cascade behavior defined. */
  async remove(id: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.categoryRepo.manager
      .getRepository(Product)
      .count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new ConflictException(
        `Không thể xoá — còn ${productCount} sản phẩm thuộc danh mục này`,
      );
    }

    await this.categoryRepo.remove(category);
  }

  /** Vietnamese-aware slugify: `đ`/`Đ` don't decompose via NFD like the other accented vowels do, so they're replaced explicitly first. Combining marks (U+0300-U+036F) left over after NFD are stripped by char code, not a literal regex range, to avoid embedding raw combining characters in source. */
  private slugify(input: string): string {
    const withoutDiacritics = input
      .trim()
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .split('')
      .filter((ch) => {
        const code = ch.codePointAt(0)!;
        return code < 0x0300 || code > 0x036f;
      })
      .join('');

    return withoutDiacritics.replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
  }
}
