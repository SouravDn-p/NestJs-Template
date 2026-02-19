import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../users/user-dto/create-user-dto';
import { SafeUser } from '../users/schemas/userType';
import { UsersService } from '../users/users.service';
import { GlobalResponse } from '../../common/response/global-response.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserCredentials } from '../users/schemas/userType';
import { UserDocument } from '../users/schemas/user.schema';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async CreateUser(createUserDto: CreateUserDto): Promise<GlobalResponse<SafeUser>> {
    return this.usersService.CreateUser(createUserDto);
  }

  async validateUser(credentials: UserCredentials): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(credentials.email);
    if (user && (await bcrypt.compare(credentials.password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, hashedRefreshToken, ...result } = user;
      return result as UserDocument;
    }
    return null;
  }

  async login(user: UserDocument): Promise<{ accessToken: string; refreshToken: string; user: SafeUser; message: string }> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Generate tokens
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m' as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d' as any,
    });

    // Store hashed refresh token in database
    await this.usersService.updateRefreshToken(user._id.toString(), refreshToken);

    // Prepare safe user object (without refreshToken)
    const safeUser: SafeUser = {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      image: user.image || null,
    };

    return {
      accessToken,
      refreshToken,
      user: safeUser,
      message: 'Login successful',
    };
  }

  async refresh(userId: string, currentRefreshToken: string): Promise<{ accessToken: string; refreshToken: string; message: string }> {
    // Validate the current refresh token
    const isValid = await this.usersService.validateRefreshToken(userId, currentRefreshToken);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Generate new tokens (token rotation)
    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m' as any,
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d' as any,
    });

    // Update with new hashed refresh token (rotation)
    await this.usersService.updateRefreshToken(userId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed successfully',
    };
  }

  async logout(userId: string): Promise<GlobalResponse<null>> {
    // Remove refresh token from database
    await this.usersService.updateRefreshToken(userId, null);
    
    return {
      data: null,
      message: 'Logout successful',
    };
  }
}