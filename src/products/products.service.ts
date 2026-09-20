import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service.js';
import type { CategorySlug } from '../categories/category.entity.js';
import { CATEGORY_ATTRIBUTE_SCHEMA } from './attribute-schemas.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { QueryProductDto } from './dto/query-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(query: QueryProductDto) {
    const qb = this.productRepo.createQueryBuilder('product');

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.search) {
      // Simple ILIKE search for now; upgrade to PostgreSQL tsvector when search volume needs it.
      qb.andWhere('product.name ILIKE :search', { search: `%${query.search}%` });
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.validateAttributes(dto.categoryId, dto.attributes);
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (dto.categoryId || dto.attributes) {
      const categoryId = dto.categoryId ?? product.categoryId;
      const attributes = dto.attributes ?? product.attributes;
      if (!categoryId) {
        throw new BadRequestException('categoryId is required to validate attributes');
      }
      await this.validateAttributes(categoryId, attributes);
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
  }

  async findTopSelling(limit: number): Promise<string[]> {
    const rows = await this.productRepo.manager
      .createQueryBuilder()
      .select('order_items.product_id', 'productId')
      .addSelect('SUM(order_items.quantity)', 'totalSold')
      .from('order_items', 'order_items')
      .groupBy('order_items.product_id')
      .orderBy('"totalSold"', 'DESC')
      .limit(limit)
      .getRawMany<{ productId: string; totalSold: string }>();

    return rows.map((row) => row.productId);
  }

  private async validateAttributes(
    categoryId: string,
    attributes: Record<string, unknown>,
  ): Promise<void> {
    const category = await this.categoriesService.findOne(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const schema = CATEGORY_ATTRIBUTE_SCHEMA[category.slug as CategorySlug];
    const instance = plainToInstance(schema, attributes);
    const errors = await validate(instance, { whitelist: true });
    if (errors.length > 0) {
      const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
      throw new BadRequestException(
        `Invalid attributes for category "${category.slug}": ${messages.join('; ')}`,
      );
    }
  }
}
