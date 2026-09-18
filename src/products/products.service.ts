import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { QueryProductDto } from './dto/query-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './product.entity.js';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly productRepo: Repository<Product>) {}

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

  create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
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
}
