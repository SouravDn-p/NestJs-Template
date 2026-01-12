import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../../user/user.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refresh_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwt.refreshTokenSecret')!,
    });
  }

  async validate(payload: any) {
    // Check if user still exists and is active
    const user = await this.userService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Verify that the refresh token in the JWT matches the one stored in the database
    if (!user.refreshToken) {
      throw new Error('Refresh token not found');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
