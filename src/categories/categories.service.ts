import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity.js';
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

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }
}
