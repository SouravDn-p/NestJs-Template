/* eslint-disable prettier/prettier */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { StrategyOptions } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface CookieRequest {
  cookies?: {
    refreshToken?: string;
  };
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const extractor = (request: CookieRequest): string | null => {
      // For refresh strategy, we need to get the refresh token from the cookie
      // This will be the actual JWT refresh token
      if (request?.cookies?.refreshToken) {
        return request.cookies.refreshToken;
      }
      return null;
    };

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([extractor]),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      passReqToCallback: true,
    };
    
    super(options);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(req: CookieRequest, payload: JwtPayload): Promise<{
    userId: string;
    email: string;
    role: string;
  }> {
    // Extract the refresh token from the cookie
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookie');
    }

    // Check if the token has expired by verifying it against the database
    // The JWT will be decoded by Passport, but we still need to verify it's still valid in DB
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If user exists but doesn't have a hashed refresh token, it means the refresh token was invalidated
    if (!user.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Validate the refresh token by checking it against the hashed version in the database
    const isValid = await this.usersService.validateRefreshToken(payload.sub, refreshToken);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}