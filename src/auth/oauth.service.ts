import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import type { Redis } from 'ioredis';
import { randomBytes, randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.provider.js';
import { OAuthAccount, OAuthProvider } from './oauth-account.entity.js';
import { User } from './user.entity.js';

/** Matches the ~time a browser redirect round-trip (provider consent screen → our callback → SPA) realistically takes, without leaving the code valid long enough to be worth intercepting. */
const OAUTH_CODE_TTL_SECONDS = 60;

export interface OAuthJwtPayload {
  sub: string;
  role: string;
  roleId: string | null;
}

@Injectable()
export class OAuthService {
  constructor(
    @InjectRepository(OAuthAccount) private readonly oauthAccountRepo: Repository<OAuthAccount>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Links an OAuth identity to a `User` row: reuses the account if this
   * provider+providerUserId pair has signed in before, else links to an
   * existing user with the same email (so someone who registered with
   * password auth and later clicks "Sign in with Google" using the same
   * address doesn't end up with a duplicate account), else creates a new
   * customer account. An OAuth-created user gets a random unusable
   * `passwordHash` — they can only ever sign in via that provider unless
   * they separately set a password.
   */
  async findOrCreateUser(
    provider: OAuthProvider,
    providerUserId: string,
    email: string | null,
  ): Promise<User> {
    const existingAccount = await this.oauthAccountRepo.findOne({ where: { provider, providerUserId } });
    if (existingAccount) {
      const user = await this.userRepo.findOne({ where: { id: existingAccount.userId } });
      if (user) return user;
    }

    let user: User | null = email ? await this.userRepo.findOne({ where: { email } }) : null;
    if (!user) {
      if (!email) {
        throw new Error(`${provider} account did not return an email address`);
      }
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      user = this.userRepo.create({ email, passwordHash });
      await this.userRepo.save(user);
    }

    await this.oauthAccountRepo.save(
      this.oauthAccountRepo.create({ userId: user.id, provider, providerUserId }),
    );
    return user;
  }

  /** Stores the JWT payload in Redis under a random one-time code so `AuthController`'s OAuth callback can redirect the browser with just `?code=...` (never raw tokens) — `AuthService.exchangeOAuthCode()` is the only consumer of `consumeOneTimeCode()`. */
  async issueOneTimeCode(payload: OAuthJwtPayload): Promise<string> {
    const code = randomUUID();
    await this.redis.set(`oauthcode:${code}`, JSON.stringify(payload), 'EX', OAUTH_CODE_TTL_SECONDS);
    return code;
  }

  async consumeOneTimeCode(code: string): Promise<OAuthJwtPayload | null> {
    const key = `oauthcode:${code}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    return JSON.parse(raw) as OAuthJwtPayload;
  }
}
