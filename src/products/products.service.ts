import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service.js';
import { CategorySlug } from '../categories/category.entity.js';
import { CATEGORY_ATTRIBUTE_SCHEMA } from './attribute-schemas.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { QueryProductDto } from './dto/query-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductVariant } from './product-variant.entity.js';
import { Product } from './product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findAll(query: QueryProductDto) {
    const filtered = this.productRepo.createQueryBuilder('product');

    if (query.categoryId) {
      filtered.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.search) {
      // Simple ILIKE search for now; upgrade to PostgreSQL tsvector when search volume needs it.
      filtered.andWhere('product.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.brand) {
      filtered.andWhere('product.brand = :brand', { brand: query.brand });
    }

    if (query.minPrice !== undefined) {
      filtered.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      filtered.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const total = await filtered.clone().getCount();

    // Step 1 — resolve just the ordered IDs for this page via `getRawMany()`
    // (not `getRawAndEntities()`/`getMany()`): TypeORM auto-wraps
    // entity-returning queries in an extra `SELECT DISTINCT` subquery
    // whenever skip/take + any join are both present (pagination-safety for
    // to-many joins), and that wrapper only recognizes ORDER BY columns it
    // generated itself — our raw addSelect aliases (`soldCount`) don't
    // satisfy Postgres's "DISTINCT + ORDER BY" rule inside it. `getRawMany()`
    // skips that wrapper entirely, so we do our own two-step pagination.
    const idsQb = filtered.clone().select('product.id', 'id');
    // Every branch adds `product.id` as a secondary sort key — without a
    // deterministic tiebreaker, Postgres can order ties differently between
    // the two separate page queries, causing a product to appear on two
    // pages (or be skipped) whenever the primary sort column repeats.
    if (query.sort === 'bestselling') {
      idsQb
        .leftJoin(this.soldCountSubquery(), 'sales_agg', '"sales_agg"."productId" = product.id')
        .addSelect('COALESCE("sales_agg"."soldCount", 0)', 'soldCount')
        .orderBy('"soldCount"', 'DESC')
        .addOrderBy('product.id', 'ASC');
    } else if (query.sort === 'price_asc') {
      idsQb.orderBy('product.price', 'ASC').addOrderBy('product.id', 'ASC');
    } else if (query.sort === 'price_desc') {
      idsQb.orderBy('product.price', 'DESC').addOrderBy('product.id', 'ASC');
    } else {
      idsQb.orderBy('product.createdAt', 'DESC').addOrderBy('product.id', 'ASC');
    }
    // `.offset()/.limit()` (not `.skip()/.take()`): TypeORM only turns
    // skip/take into real SQL OFFSET/LIMIT when there are zero registered
    // joins (`createLimitOffsetExpression`) — with a join present (the
    // bestselling branch), skip/take are silently dropped because TypeORM
    // expects those cases to go through its entity-pagination wrapper,
    // which we deliberately bypass above. offset()/limit() always apply.
    idsQb.offset((query.page - 1) * query.limit).limit(query.limit);

    const idRows = await idsQb.getRawMany<{ id: string }>();
    const orderedIds = idRows.map((row) => row.id);
    if (orderedIds.length === 0) {
      return { items: [], total, page: query.page, limit: query.limit };
    }

    // Step 2 — fetch full rows + rating/sold aggregates for exactly this
    // page's IDs. Bounded by the IN clause, no pagination needed here, so
    // TypeORM's join+skip/take wrapper never triggers.
    const detailQb = this.productRepo
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids: orderedIds })
      .leftJoin(this.reviewSummarySubquery(), 'review_agg', '"review_agg"."productId" = product.id')
      .addSelect('COALESCE("review_agg"."averageRating", 0)', 'averageRating')
      .addSelect('COALESCE("review_agg"."reviewCount", 0)', 'reviewCount')
      .leftJoin(this.soldCountSubquery(), 'sales_agg', '"sales_agg"."productId" = product.id')
      .addSelect('COALESCE("sales_agg"."soldCount", 0)', 'soldCount')
      .leftJoin(this.variantStockSubquery(), 'variant_agg', '"variant_agg"."productId" = product.id')
      .addSelect('"variant_agg"."variantCount"', 'variantCount')
      .addSelect('COALESCE("variant_agg"."variantStock", 0)', 'variantStock');

    const { entities, raw } = await detailQb.getRawAndEntities();
    const rawByProductId = new Map(entities.map((entity, index) => [entity.id, raw[index]]));

    const items = orderedIds.map((id) => {
      const entity = entities.find((e) => e.id === id)!;
      const rawRow = rawByProductId.get(id);
      const variantCount = Number(rawRow?.variantCount ?? 0);
      return {
        ...entity,
        averageRating: Math.round(Number(rawRow?.averageRating ?? 0) * 10) / 10,
        reviewCount: Number(rawRow?.reviewCount ?? 0),
        soldCount: Number(rawRow?.soldCount ?? 0),
        effectiveStock: variantCount > 0 ? Number(rawRow?.variantStock ?? 0) : entity.stock,
      };
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  private reviewSummarySubquery(): (sub: SelectQueryBuilder<any>) => SelectQueryBuilder<any> {
    return (sub) =>
      sub
        .select('review.product_id', 'productId')
        .addSelect('AVG(review.rating)', 'averageRating')
        .addSelect('COUNT(*)', 'reviewCount')
        .from('reviews', 'review')
        .groupBy('review.product_id');
  }

  /** Sold quantity from paid/completed orders only — a cancelled order's items shouldn't count as "bestselling". */
  private soldCountSubquery(): (sub: SelectQueryBuilder<any>) => SelectQueryBuilder<any> {
    return (sub) =>
      sub
        .select('order_items.product_id', 'productId')
        .addSelect('SUM(order_items.quantity)', 'soldCount')
        .from('order_items', 'order_items')
        .innerJoin('orders', 'orders', 'orders.id = order_items.order_id')
        .where('orders.status IN (:...soldStatuses)', { soldStatuses: ['paid', 'completed'] })
        .groupBy('order_items.product_id');
  }

  private variantStockSubquery(): (sub: SelectQueryBuilder<any>) => SelectQueryBuilder<any> {
    return (sub) =>
      sub
        .select('variant.product_id', 'productId')
        .addSelect('SUM(variant.stock)', 'variantStock')
        .addSelect('COUNT(*)', 'variantCount')
        .from('product_variants', 'variant')
        .groupBy('variant.product_id');
  }

  async findDistinctBrands(categoryId?: string): Promise<string[]> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.brand', 'brand')
      .where('product.brand IS NOT NULL')
      .orderBy('product.brand', 'ASC');

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    const rows = await qb.getRawMany<{ brand: string }>();
    return rows.map((row) => row.brand);
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const variants = await this.variantRepo.find({ where: { productId: id } });
    return { ...product, variants };
  }

  async create(dto: CreateProductDto) {
    await this.validateAttributes(dto.categoryId, dto.attributes, dto.images ?? []);
    const { variants, ...productFields } = dto;
    const product = this.productRepo.create(productFields);
    await this.productRepo.save(product);
    await this.saveVariants(product.id, variants);
    return this.findOne(product.id);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id);

    if (dto.categoryId || dto.attributes) {
      const categoryId = dto.categoryId ?? existing.categoryId;
      const attributes = dto.attributes ?? existing.attributes;
      if (!categoryId) {
        throw new BadRequestException('categoryId is required to validate attributes');
      }
      await this.validateAttributes(categoryId, attributes, dto.images ?? existing.images);
    }

    const { variants, ...productFields } = dto;
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    Object.assign(product, productFields);
    await this.productRepo.save(product);

    if (variants !== undefined) {
      await this.saveVariants(id, variants);
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    await this.productRepo.remove(product);
  }

  /** Admin-only, low-frequency — delete-and-recreate is simpler than diffing individual rows. */
  private async saveVariants(
    productId: string,
    variants: CreateProductDto['variants'],
  ): Promise<void> {
    if (variants === undefined) return;
    await this.variantRepo.delete({ productId });
    if (variants.length === 0) return;
    await this.variantRepo.save(variants.map((v) => this.variantRepo.create({ ...v, productId })));
  }

  /** Flat list of every image URL across all products — used by the Cloudinary cleanup cron. */
  async findAllImageUrls(): Promise<string[]> {
    const rows = await this.productRepo
      .createQueryBuilder('product')
      .select('product.images', 'images')
      .getRawMany<{ images: string[] }>();
    return rows.flatMap((row) => row.images ?? []);
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
    images: string[],
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

    if (category.slug === CategorySlug.APPAREL) {
      const colorImages = (attributes as { colorImages?: Record<string, string> }).colorImages;
      if (colorImages) {
        const invalidUrls = Object.values(colorImages).filter((url) => !images.includes(url));
        if (invalidUrls.length > 0) {
          throw new BadRequestException(
            `attributes.colorImages values must reference URLs already present in "images": ${invalidUrls.join(', ')}`,
          );
        }
      }
    }
  }
}
