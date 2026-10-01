import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import { OAuthProvider } from './oauth-account.entity.js';
import { OAuthService } from './oauth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      // Non-empty placeholders, not '' — `passport-oauth2` throws a
      // `TypeError` at construction time (app bootstrap) if `clientID` is
      // falsy, so an unset env var must not resolve to an empty string.
      // With placeholders the app boots fine; only an actual round-trip to
      // Google would fail, same "fails by design until real credentials
      // exist" situation as `RecProxyService`/Momo checkout.
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', 'not-configured'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', 'not-configured'),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/oauth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value ?? null;
      const user = await this.oauthService.findOrCreateUser(OAuthProvider.GOOGLE, profile.id, email);
      done(null, { sub: user.id, role: user.role, roleId: user.roleId });
    } catch (error) {
      done(error as Error, false);
    }
  }
}
