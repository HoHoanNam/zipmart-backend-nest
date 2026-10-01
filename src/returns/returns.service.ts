import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/notification.entity.js';
import { OrderItem } from '../orders/order-item.entity.js';
import { Order, OrderStatus } from '../orders/order.entity.js';
import { Payment, PaymentStatus } from '../payments/payment.entity.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { CreateReturnRequestDto } from './dto/create-return-request.dto.js';
import type { ResolveReturnRequestDto } from './dto/resolve-return-request.dto.js';
import { ReturnRequest, ReturnStatus } from './return-request.entity.js';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReturnRequestDto): Promise<ReturnRequest> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể yêu cầu đổi trả cho đơn hàng đã hoàn thành');
    }

    const orderItem = await this.orderItemRepo.findOne({ where: { id: dto.orderItemId } });
    if (!orderItem || orderItem.orderId !== order.id) {
      throw new BadRequestException('Sản phẩm không thuộc đơn hàng này');
    }

    const existing = await this.returnRepo.findOne({
      where: { orderItemId: dto.orderItemId, status: ReturnStatus.REQUESTED },
    });
    if (existing) {
      throw new BadRequestException('Đã có yêu cầu đổi trả đang chờ xử lý cho sản phẩm này');
    }

    const returnRequest = this.returnRepo.create({
      orderId: order.id,
      userId,
      orderItemId: dto.orderItemId,
      reason: dto.reason,
      note: dto.note ?? null,
    });
    return this.returnRepo.save(returnRequest);
  }

  findForUser(userId: string): Promise<ReturnRequest[]> {
    return this.returnRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findAll(): Promise<ReturnRequest[]> {
    return this.returnRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Single admin decision point. `reject` just closes the request.
   * `approve` resolves in the same call: refunds through the gateway if a
   * succeeded `Payment` exists for the order (→ `refunded`), otherwise
   * closes it as `completed` (COD order — refund handled manually offline,
   * outside this system).
   */
  async resolve(id: string, adminUserId: string, dto: ResolveReturnRequestDto): Promise<ReturnRequest> {
    const returnRequest = await this.returnRepo.findOne({ where: { id } });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    if (returnRequest.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestException('Yêu cầu đổi trả này đã được xử lý');
    }

    returnRequest.resolvedByUserId = adminUserId;
    if (dto.note) {
      returnRequest.note = dto.note;
    }

    if (dto.action === 'reject') {
      returnRequest.status = ReturnStatus.REJECTED;
      await this.returnRepo.save(returnRequest);
      this.notify(returnRequest, 'Yêu cầu đổi trả bị từ chối', 'Yêu cầu đổi trả của bạn đã bị từ chối.');
      return returnRequest;
    }

    const orderItem = await this.orderItemRepo.findOne({ where: { id: returnRequest.orderItemId } });
    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }
    const refundAmount = Number(orderItem.unitPrice) * orderItem.quantity;

    const succeededPayment = await this.paymentRepo.findOne({
      where: { orderId: returnRequest.orderId, status: PaymentStatus.SUCCEEDED },
      order: { createdAt: 'DESC' },
    });

    if (succeededPayment) {
      await this.paymentsService.refund(succeededPayment.id, refundAmount);
      returnRequest.refundPaymentId = succeededPayment.id;
      returnRequest.status = ReturnStatus.REFUNDED;
    } else {
      returnRequest.status = ReturnStatus.COMPLETED;
    }
    returnRequest.refundAmount = refundAmount.toFixed(2);
    await this.returnRepo.save(returnRequest);

    this.notify(
      returnRequest,
      'Yêu cầu đổi trả đã được chấp nhận',
      succeededPayment
        ? `Đơn hàng của bạn đã được hoàn ${refundAmount.toLocaleString('vi-VN')}đ qua cổng thanh toán.`
        : 'Yêu cầu đổi trả của bạn đã được chấp nhận, số tiền hoàn sẽ được xử lý thủ công.',
    );
    return returnRequest;
  }

  private notify(returnRequest: ReturnRequest, title: string, body: string): void {
    void this.notificationsService.notifyUser(
      returnRequest.userId,
      NotificationType.RETURN_STATUS,
      title,
      body,
      returnRequest.id,
    );
  }
}
