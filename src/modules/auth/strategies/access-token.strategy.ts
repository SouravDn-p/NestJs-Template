import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../../user/user.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwt.accessTokenSecret')!,
    });
  }

  async validate(payload: any) {
    // Check if user still exists and is active
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
