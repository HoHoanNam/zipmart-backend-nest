import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Order, OrderPaymentStatus } from '../orders/order.entity.js';
import type { CreateCheckoutDto } from './dto/create-checkout.dto.js';
import { Payment, PaymentGateway, PaymentStatus } from './payment.entity.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createCheckout(
    dto: CreateCheckoutDto,
    ipAddr: string,
  ): Promise<{ payment: Payment; checkoutUrl: string }> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.paymentStatus === OrderPaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId: order.id,
        gateway: dto.gateway,
        amount: order.total,
        status: PaymentStatus.PENDING,
      }),
    );

    const checkoutUrl =
      dto.gateway === PaymentGateway.VNPAY
        ? this.buildVnpayCheckoutUrl(payment, ipAddr)
        : await this.createMomoCheckoutUrl(payment);

    return { payment, checkoutUrl };
  }

  findByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
  }

  // ---------- VNPay ----------

  private buildVnpayCheckoutUrl(payment: Payment, ipAddr: string): string {
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', '');
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET', '');
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL', '');
    const payUrl = this.configService.get<string>(
      'VNPAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.id,
      vnp_OrderInfo: `Thanh toan don hang ${payment.orderId}`,
      vnp_OrderType: 'other',
      // VNPay has no subunit for VND — amount is the raw value * 100.
      vnp_Amount: String(Math.round(Number(payment.amount) * 100)),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: this.formatVnpayDate(new Date()),
    };

    const signData = this.buildVnpaySignData(params);
    const secureHash = createHmac('sha512', hashSecret).update(signData).digest('hex');
    const query = new URLSearchParams({ ...params, vnp_SecureHash: secureHash }).toString();
    return `${payUrl}?${query}`;
  }

  /** Shared by the checkout-URL builder and the return/IPN verifiers — VNPay signs the alphabetically-sorted, URL-encoded `key=value` pairs (excluding the hash fields themselves). */
  private buildVnpaySignData(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== '')
      .sort();
    return sortedKeys.map((key) => `${key}=${encodeURIComponent(params[key])}`).join('&');
  }

  private formatVnpayDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }

  private verifyVnpaySignature(query: Record<string, string>): boolean {
    const { vnp_SecureHash, vnp_SecureHashType: _unused, ...rest } = query;
    if (!vnp_SecureHash) return false;
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET', '');
    const signData = this.buildVnpaySignData(rest);
    const expected = createHmac('sha512', hashSecret).update(signData).digest('hex');
    return expected === vnp_SecureHash;
  }

  /** Browser redirect landing — display-only, NOT the authoritative settlement point (that's `handleVnpayIpn()`, called server-to-server by VNPay independently of whether the customer's browser ever returns). */
  async handleVnpayReturn(
    query: Record<string, string>,
  ): Promise<{ success: boolean; orderId: string | null }> {
    const validSignature = this.verifyVnpaySignature(query);
    const txnRef = query.vnp_TxnRef;
    if (!validSignature || !txnRef) {
      return { success: false, orderId: null };
    }

    const payment = await this.paymentRepo.findOne({ where: { id: txnRef } });
    return { success: query.vnp_ResponseCode === '00', orderId: payment?.orderId ?? null };
  }

  /** Server-to-server webhook — the real settlement point. Must always return the `{RspCode, Message}` shape VNPay expects, even on failure, or VNPay keeps retrying. Idempotent on `vnp_TxnRef` (our `Payment.id`). */
  async handleVnpayIpn(query: Record<string, string>): Promise<{ RspCode: string; Message: string }> {
    if (!this.verifyVnpaySignature(query)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const payment = await this.paymentRepo.findOne({ where: { id: query.vnp_TxnRef } });
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }
    // Re-delivered webhook for an attempt we already settled — acknowledge
    // without re-applying the paid/refunded side effects a second time.
    if (payment.status !== PaymentStatus.PENDING) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }
    if (Number(query.vnp_Amount) !== Math.round(Number(payment.amount) * 100)) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    await this.settlePayment(payment, query.vnp_ResponseCode === '00', query.vnp_TransactionNo ?? null, query);
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  // ---------- Momo ----------

  /**
   * Calls Momo's `create` API for a redirectable `payUrl`. Needs real Momo
   * test-merchant credentials to actually succeed — with placeholder env
   * vars this reaches Momo's sandbox and gets rejected by them, the same
   * "fails by design until real credentials exist" situation as
   * `RecProxyService` before `zipmart-backend-spring` existed.
   */
  private async createMomoCheckoutUrl(payment: Payment): Promise<string> {
    const partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', '');
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', '');
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '');
    const returnUrl = this.configService.get<string>('MOMO_RETURN_URL', '');
    const endpoint = this.configService.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
    const ipnUrl = this.configService.get<string>('MOMO_IPN_URL', returnUrl);

    const requestId = payment.id;
    const orderId = payment.id;
    const amount = String(Math.round(Number(payment.amount)));
    const orderInfo = `Thanh toan don hang ${payment.orderId}`;
    const requestType = 'captureWallet';
    const extraData = '';

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ payUrl?: string; message?: string }>(endpoint, body),
      );
      const payUrl = response.data?.payUrl;
      if (!payUrl) {
        throw new Error(response.data?.message ?? 'Momo did not return a payUrl');
      }
      return payUrl;
    } catch (error) {
      this.logger.error(`Momo checkout creation failed: ${(error as Error).message}`);
      throw new BadRequestException('Không thể khởi tạo thanh toán Momo lúc này');
    }
  }

  private verifyMomoSignature(payload: Record<string, string>): boolean {
    const secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '');
    const accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', '');
    const { signature } = payload;
    if (!signature) return false;

    const rawSignature =
      `accessKey=${accessKey}&amount=${payload.amount}&extraData=${payload.extraData ?? ''}` +
      `&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}` +
      `&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}` +
      `&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}` +
      `&transId=${payload.transId}`;
    const expected = createHmac('sha256', secretKey).update(rawSignature).digest('hex');
    return expected === signature;
  }

  async handleMomoReturn(
    query: Record<string, string>,
  ): Promise<{ success: boolean; orderId: string | null }> {
    const payment = await this.paymentRepo.findOne({ where: { id: query.orderId } });
    return { success: query.resultCode === '0', orderId: payment?.orderId ?? null };
  }

  async handleMomoIpn(body: Record<string, string>): Promise<{ resultCode: number; message: string }> {
    if (!this.verifyMomoSignature(body)) {
      return { resultCode: 97, message: 'Invalid signature' };
    }

    const payment = await this.paymentRepo.findOne({ where: { id: body.orderId } });
    if (!payment) {
      return { resultCode: 1, message: 'Order not found' };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      return { resultCode: 0, message: 'Already confirmed' };
    }

    await this.settlePayment(payment, body.resultCode === '0', body.transId ?? null, body);
    return { resultCode: 0, message: 'Confirm Success' };
  }

  // ---------- Shared ----------

  private async settlePayment(
    payment: Payment,
    succeeded: boolean,
    gatewayTransactionId: string | null,
    rawResponse: Record<string, unknown>,
  ): Promise<void> {
    payment.status = succeeded ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    payment.gatewayTransactionId = gatewayTransactionId;
    payment.rawResponse = rawResponse;
    await this.paymentRepo.save(payment);

    if (succeeded) {
      await this.orderRepo.update({ id: payment.orderId }, { paymentStatus: OrderPaymentStatus.PAID });
    }
  }

  /**
   * Used by `ReturnsService.resolve()` on approval. No real gateway refund
   * API call here (would need live merchant credentials) — marks the
   * payment/order refunded so the rest of the system (order history,
   * analytics) reflects it consistently. Swap in a real gateway refund call
   * once production credentials exist.
   */
  async refund(paymentId: string, amount: number): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only a succeeded payment can be refunded');
    }
    if (amount > Number(payment.amount)) {
      throw new BadRequestException('Refund amount exceeds the original payment amount');
    }

    payment.status = PaymentStatus.REFUNDED;
    await this.paymentRepo.save(payment);
    await this.orderRepo.update({ id: payment.orderId }, { paymentStatus: OrderPaymentStatus.REFUNDED });
    return payment;
  }
}
