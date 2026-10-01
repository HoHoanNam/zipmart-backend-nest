import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity.js';
import type { QueryAuditLogDto } from './dto/query-audit-log.dto.js';

@Injectable()
export class AuditLogsService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>) {}

  async findAll(
    query: QueryAuditLogDto,
  ): Promise<{ items: AuditLog[]; total: number; page: number; limit: number }> {
    const qb = this.auditLogRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }

    const total = await qb.getCount();
    const items = await qb
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getMany();

    return { items, total, page: query.page, limit: query.limit };
  }
}
