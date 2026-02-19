/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StrategyOptions } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface CookieRequest {
  cookies?: {
    accessToken?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const extractor = (request: CookieRequest): string | null => {
      if (request?.cookies?.accessToken) {
        return request.cookies.accessToken;
      }
      return null;
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([extractor]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
    };

    super(options);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload): Promise<{
    userId: string;
    email: string;
    role: string;
  }> {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}