import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service.js';
import { OAuthService } from './oauth.service.js';
import { PasswordResetToken } from './password-reset-token.entity.js';
import { User } from './user.entity.js';

/** Reset links stay valid for 1 hour — long enough for a realistic "check email" delay, short enough to keep a leaked link's exposure window small. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

interface JwtPayload {
  sub: string;
  role: string;
  roleId: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly oauthService: OAuthService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, passwordHash });
    await this.userRepo.save(user);

    return this.issueTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    return { success: true };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokens(user);
  }

  /**
   * Always resolves the same way (`{ success: true }`) whether or not the
   * email is registered — a different response would let an attacker probe
   * which emails have accounts. Sending the actual mail is still
   * conditional on the user existing, it just never leaks that fact back
   * in the response.
   */
  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      this.logger.debug(`Password reset requested for unknown email: ${email}`);
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    await this.passwordResetTokenRepo.save(
      this.passwordResetTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      }),
    );

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendMail({
      to: user.email,
      subject: 'Đặt lại mật khẩu zipmart',
      html: `<p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu (hết hạn sau 1 giờ):</p><p><a href="${resetLink}">${resetLink}</a></p><p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
    });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
    const tokenHash = this.hashResetToken(token);
    const resetToken = await this.passwordResetTokenRepo.findOne({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.userRepo.findOne({ where: { id: resetToken.userId } });
    if (!user) {
      throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    resetToken.usedAt = new Date();
    await this.passwordResetTokenRepo.save(resetToken);

    return { success: true };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** SPA half of A.4's OAuth flow — the redirect endpoints in `AuthController` issue a short-lived Redis-backed code instead of tokens directly (keeps tokens out of the browser's address bar/history); this exchanges that code for real tokens. */
  async exchangeOAuthCode(code: string) {
    const payload = await this.oauthService.consumeOneTimeCode(code);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    return this.issueTokensFromPayload(payload);
  }

  private issueTokens(user: User) {
    return this.issueTokensFromPayload({ sub: user.id, role: user.role, roleId: user.roleId });
  }

  private issueTokensFromPayload(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN_SECONDS', '900')),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: Number(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS', '604800'),
      ),
    });

    return { accessToken, refreshToken };
  }
}
