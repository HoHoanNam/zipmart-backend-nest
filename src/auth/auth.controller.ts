import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from './auth.guard.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ExchangeOAuthCodeDto } from './dto/exchange-oauth-code.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { FacebookAuthGuard } from './facebook-auth.guard.js';
import { GoogleAuthGuard } from './google-auth.guard.js';
import { AuthService } from './auth.service.js';
import { OAuthService, type OAuthJwtPayload } from './oauth.service.js';

// Tighter than the global 100 req/min default — these endpoints are the
// direct target of password-spraying/credential-stuffing attacks.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  /** Kicks off the Google consent flow — `GoogleAuthGuard` intercepts the request and redirects to Google before this handler body ever runs. */
  @Get('oauth/google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {}

  /** Google redirects the browser back here after consent; `GoogleAuthGuard` runs `GoogleStrategy.validate()` first, which upserts the `User`/`OAuthAccount` and sets `req.user`. */
  @Get('oauth/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.redirectWithOAuthCode(req, res);
  }

  @Get('oauth/facebook')
  @UseGuards(FacebookAuthGuard)
  facebookAuth(): void {}

  @Get('oauth/facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.redirectWithOAuthCode(req, res);
  }

  /** SPA exchanges the short-lived one-time code (from the `oauth-callback` redirect below) for real access/refresh tokens — keeps tokens out of the browser's address bar/history. */
  @Throttle(AUTH_THROTTLE)
  @Post('oauth/exchange')
  exchangeOAuthCode(@Body() dto: ExchangeOAuthCodeDto) {
    return this.authService.exchangeOAuthCode(dto.code);
  }

  private async redirectWithOAuthCode(req: Request, res: Response): Promise<void> {
    const payload = req.user as OAuthJwtPayload;
    const code = await this.oauthService.issueOneTimeCode(payload);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
    res.redirect(`${frontendUrl}/oauth-callback?code=${code}`);
  }
}
