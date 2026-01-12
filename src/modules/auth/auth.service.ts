import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = await this.userService.createUser({
      email: registerDto.email,
      password: registerDto.password,
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: { id: user._id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.userService.findByEmailWithPassword(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isValidPassword = await user.comparePassword(loginDto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      user: { id: user._id, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async logout(userId: string) {
    // Remove refresh token from database
    await this.userService.removeRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    // Verify the provided refresh token matches the one in database
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const accessToken = await this.generateAccessToken(userId, email, role);
    const refreshToken = await this.generateRefreshToken(userId, email, role);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwt.accessTokenSecret')!,
      expiresIn:
        this.configService.get<string>('auth.jwt.accessTokenExpiration') ||
        '15m',
    } as any);
  }

  private async generateRefreshToken(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwt.refreshTokenSecret')!,
      expiresIn:
        this.configService.get<string>('auth.jwt.refreshTokenExpiration') ||
        '7d',
    } as any);
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(userId, hashedRefreshToken);
  }
}
