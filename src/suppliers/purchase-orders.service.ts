import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Product } from '../products/product.entity.js';
import { StockMovement } from '../products/stock-movement.entity.js';
import type { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { PurchaseOrderItem } from './purchase-order-item.entity.js';
import { PurchaseOrder, PurchaseOrderStatus } from './purchase-order.entity.js';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder) private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(StockMovement) private readonly stockMovementRepo: Repository<StockMovement>,
  ) {}

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PurchaseOrder & { items: PurchaseOrderItem[] }> {
    const purchaseOrder = await this.findOrThrow(id);
    const items = await this.purchaseOrderItemRepo.find({ where: { purchaseOrderId: id } });
    return { ...purchaseOrder, items };
  }

  async create(userId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepo.save(
      this.purchaseOrderRepo.create({ supplierId: dto.supplierId, note: dto.note ?? null, createdByUserId: userId }),
    );
    await this.purchaseOrderItemRepo.save(
      dto.items.map((item) =>
        this.purchaseOrderItemRepo.create({ ...item, purchaseOrderId: purchaseOrder.id }),
      ),
    );
    return purchaseOrder;
  }

  /**
   * Marks stock as physically received: increments `Product.stock` for
   * every line item and writes a `StockMovement` row for each — the same
   * existing table `ProductsService.adjustStock()` writes to for manual
   * admin adjustments, reused here rather than a new ledger table, per the
   * plan's explicit instruction not to duplicate it.
   */
  async receive(id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOrThrow(id);
    if (purchaseOrder.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể nhận hàng cho đơn nhập đang chờ xử lý');
    }

    const items = await this.purchaseOrderItemRepo.find({ where: { purchaseOrderId: id } });

    await this.purchaseOrderRepo.manager.transaction(async (manager: EntityManager) => {
      for (const item of items) {
        await manager.getRepository(Product).increment({ id: item.productId }, 'stock', item.quantity);
        await manager.getRepository(StockMovement).save(
          manager.getRepository(StockMovement).create({
            productId: item.productId,
            change: item.quantity,
            reason: `Nhập hàng từ đơn nhập #${id}`,
          }),
        );
      }
      purchaseOrder.status = PurchaseOrderStatus.RECEIVED;
      purchaseOrder.receivedAt = new Date();
      await manager.getRepository(PurchaseOrder).save(purchaseOrder);
    });

    return purchaseOrder;
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.findOrThrow(id);
    if (purchaseOrder.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể huỷ đơn nhập đang chờ xử lý');
    }
    purchaseOrder.status = PurchaseOrderStatus.CANCELLED;
    return this.purchaseOrderRepo.save(purchaseOrder);
  }

  private async findOrThrow(id: string): Promise<PurchaseOrder> {
    const purchaseOrder = await this.purchaseOrderRepo.findOne({ where: { id } });
    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }
    return purchaseOrder;
  }
}
