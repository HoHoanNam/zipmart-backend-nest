import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { OAuthProvider } from './oauth-account.entity.js';
import { OAuthService } from './oauth.service.js';

type FacebookDoneCallback = (
  error: Error | null,
  user?: false | { sub: string; role: string; roleId: string | null },
) => void;

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {
    super({
      // Non-empty placeholders — see the matching comment in `google.strategy.ts`.
      clientID: configService.get<string>('FACEBOOK_APP_ID', 'not-configured'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET', 'not-configured'),
      callbackURL: configService.get<string>(
        'FACEBOOK_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/oauth/facebook/callback',
      ),
      profileFields: ['id', 'displayName', 'emails'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: FacebookDoneCallback,
  ): Promise<void> {
    try {
      const email = profile.emails?.[0]?.value ?? null;
      const user = await this.oauthService.findOrCreateUser(OAuthProvider.FACEBOOK, profile.id, email);
      done(null, { sub: user.id, role: user.role, roleId: user.roleId });
    } catch (error) {
      done(error as Error, false);
    }
  }
}
