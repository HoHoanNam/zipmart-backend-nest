import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { LoyaltyAccount } from './loyalty-account.entity.js';
import { LoyaltyTransaction, LoyaltyTransactionType } from './loyalty-transaction.entity.js';

export interface LoyaltyRedemption {
  discountAmount: number;
  newBalance: number;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);
  private readonly earnRate: number;
  private readonly redemptionRate: number;

  constructor(
    @InjectRepository(LoyaltyAccount) private readonly accountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepo: Repository<LoyaltyTransaction>,
    private readonly configService: ConfigService,
  ) {
    // Points earned per currency unit spent (order total in VND) — default
    // 0.001 = 1 point per 1,000đ spent.
    this.earnRate = Number(this.configService.get<string>('LOYALTY_EARN_RATE', '0.001'));
    // Currency value (VND) of 1 point when redeemed — default 100đ/point,
    // deliberately below the ~1,000đ/point earn cost so the platform keeps
    // a margin on the program rather than a break-even 1:1 exchange.
    this.redemptionRate = Number(this.configService.get<string>('LOYALTY_REDEMPTION_RATE', '100'));
  }

  async findMe(userId: string): Promise<{ pointsBalance: number; transactions: LoyaltyTransaction[] }> {
    const account = await this.getOrCreateAccount(userId);
    const transactions = await this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { pointsBalance: account.pointsBalance, transactions };
  }

  /**
   * Called from `OrdersService` when an order transitions to `COMPLETED`
   * (`markReceived()` and admin `updateStatus()`). A side effect of that
   * transition, not the point of the request — like `notifyStatusChange()`
   * right next to it, a failure here must never fail the status update
   * itself, so this never throws.
   */
  async earnForOrder(userId: string, orderId: string, orderTotal: number): Promise<void> {
    try {
      const alreadyEarned = await this.transactionRepo.findOne({
        where: { orderId, type: LoyaltyTransactionType.EARN },
      });
      if (alreadyEarned) return; // Defensive — the order state machine should already prevent re-entering COMPLETED twice.

      const points = Math.floor(orderTotal * this.earnRate);
      if (points <= 0) return;

      const account = await this.getOrCreateAccount(userId);
      account.pointsBalance += points;
      await this.accountRepo.save(account);
      await this.transactionRepo.save(
        this.transactionRepo.create({
          userId,
          orderId,
          type: LoyaltyTransactionType.EARN,
          points,
          balanceAfter: account.pointsBalance,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to award loyalty points for order ${orderId}`, error as Error);
    }
  }

  /**
   * First half of redemption, called from inside `OrdersService.checkout()`'s
   * transaction before the order row exists yet — mirrors
   * `CouponsService.applyCouponInTransaction()`: locks the account row
   * (`pessimistic_write`) and decrements the balance immediately (so two
   * concurrent checkouts can't both read a sufficient balance and race past
   * it), but defers writing the ledger row to `recordRedemption()` since
   * that needs the order's id, which doesn't exist until after this returns.
   */
  async redeemInTransaction(
    manager: EntityManager,
    userId: string,
    points: number,
  ): Promise<LoyaltyRedemption> {
    if (points <= 0) {
      throw new BadRequestException('Số điểm sử dụng phải lớn hơn 0');
    }

    const accountRepo = manager.getRepository(LoyaltyAccount);
    let account = await accountRepo.findOne({ where: { userId }, lock: { mode: 'pessimistic_write' } });
    if (!account) {
      account = await accountRepo.save(accountRepo.create({ userId, pointsBalance: 0 }));
    }
    if (account.pointsBalance < points) {
      throw new BadRequestException('Số điểm tích lũy không đủ');
    }

    account.pointsBalance -= points;
    await accountRepo.save(account);

    return { discountAmount: points * this.redemptionRate, newBalance: account.pointsBalance };
  }

  /** Second half of redemption — called right after the order row is saved, same two-step pattern as `CouponsService.recordUsage()`. */
  recordRedemption(
    manager: EntityManager,
    userId: string,
    orderId: string,
    points: number,
    newBalance: number,
  ): Promise<LoyaltyTransaction> {
    const repo = manager.getRepository(LoyaltyTransaction);
    return repo.save(
      repo.create({
        userId,
        orderId,
        type: LoyaltyTransactionType.REDEEM,
        points: -points,
        balanceAfter: newBalance,
      }),
    );
  }

  private async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    const existing = await this.accountRepo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.accountRepo.save(this.accountRepo.create({ userId, pointsBalance: 0 }));
  }
}
