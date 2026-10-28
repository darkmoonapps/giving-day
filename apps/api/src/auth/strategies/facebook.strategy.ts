import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AuthService, type SocialProfile } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID || 'unconfigured-facebook-app-id',
      clientSecret:
        process.env.FACEBOOK_APP_SECRET || 'unconfigured-facebook-app-secret',
      callbackURL: `${process.env.API_URL || 'http://localhost:3001'}/api/auth/facebook/callback`,
      scope: ['email'],
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: Express.User | false) => void
  ): Promise<void> {
    const socialProfile: SocialProfile = {
      provider: 'facebook',
      providerSubject: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };

    try {
      const user = await this.authService.validateOrCreateUser(socialProfile);
      done(null, user);
    } catch (error) {
      if (error instanceof Error) {
        done(error);
      } else {
        done(new Error('auth.facebook_failed'));
      }
    }
  }
}
