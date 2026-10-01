import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity.js';
import { BulkImportJob, BulkImportJobStatus, type BulkImportRowError } from './bulk-import-job.entity.js';
import { ImportProductRowDto } from './dto/import-product-row.dto.js';

@Injectable()
export class ProductsImportService {
  constructor(
    @InjectRepository(BulkImportJob) private readonly jobRepo: Repository<BulkImportJob>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  /** Validates every row via the same `class-validator` machinery `ProductsService.validateAttributes()` uses, but never writes to `products` — that only happens in `commit()`, and only for a job whose rows already passed here. */
  async dryRun(userId: string, csv: string): Promise<BulkImportJob> {
    let records: Record<string, string>[];
    try {
      records = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<
        string,
        string
      >[];
    } catch (error) {
      throw new BadRequestException(`Không đọc được file CSV: ${(error as Error).message}`);
    }

    const errors: BulkImportRowError[] = [];
    const validRows: ImportProductRowDto[] = [];

    for (let i = 0; i < records.length; i++) {
      const instance = plainToInstance(ImportProductRowDto, records[i]);
      const validationErrors = await validate(instance, { whitelist: true });
      if (validationErrors.length > 0) {
        const messages = validationErrors.flatMap((error) => Object.values(error.constraints ?? {}));
        // Row 1 is the header, so the first data row is CSV line 2 —
        // +2 (not +1) keeps this number matching what the admin sees if
        // they open the file in a spreadsheet editor.
        errors.push({ row: i + 2, message: messages.join('; ') });
        continue;
      }
      validRows.push(instance);
    }

    const job = this.jobRepo.create({
      status: BulkImportJobStatus.VALIDATED,
      totalRows: records.length,
      validRowCount: validRows.length,
      errorRowCount: errors.length,
      errors: errors.length > 0 ? errors : null,
      validRows: validRows as unknown as Record<string, unknown>[],
      createdByUserId: userId,
    });
    return this.jobRepo.save(job);
  }

  findOne(jobId: string): Promise<BulkImportJob> {
    return this.findOrThrow(jobId);
  }

  /** Upserts by `sku` — an existing product with the same SKU is updated in place, otherwise a new one is created with empty `attributes`/no variants (see the doc comment on `ImportProductRowDto`). */
  async commit(jobId: string): Promise<{ created: number; updated: number }> {
    const job = await this.findOrThrow(jobId);
    if (job.status === BulkImportJobStatus.COMMITTED) {
      throw new BadRequestException('Import job này đã được áp dụng trước đó');
    }

    const rows = job.validRows as unknown as ImportProductRowDto[];
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = await this.productRepo.findOne({ where: { sku: row.sku } });
      if (existing) {
        existing.name = row.name;
        existing.categoryId = row.categoryId;
        existing.brand = row.brand ?? existing.brand;
        existing.description = row.description ?? existing.description;
        existing.price = row.price;
        existing.stock = row.stock;
        await this.productRepo.save(existing);
        updated++;
      } else {
        await this.productRepo.save(
          this.productRepo.create({
            sku: row.sku,
            name: row.name,
            categoryId: row.categoryId,
            brand: row.brand ?? null,
            description: row.description ?? null,
            price: row.price,
            stock: row.stock,
            attributes: {},
            images: [],
          }),
        );
        created++;
      }
    }

    job.status = BulkImportJobStatus.COMMITTED;
    await this.jobRepo.save(job);
    return { created, updated };
  }

  private async findOrThrow(jobId: string): Promise<BulkImportJob> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }
}
