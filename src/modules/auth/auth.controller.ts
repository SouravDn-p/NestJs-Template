/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/user-dto/create-user-dto';
import type {
  CreateUserResponse,
  UserCredentials,
} from '../users/schemas/userType';
import { GlobalResponse } from '../../common/response/global-response.interface';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

// Extend the Request interface to include user property
interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<GlobalResponse<CreateUserResponse>> {
    return await this.authService.CreateUser(createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() credentials: UserCredentials,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(credentials);
    if (!user) {
      return {
        data: null,
        message: 'Invalid credentials',
      };
    }

    const result = await this.authService.login(user);

    // Set access token cookie
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token cookie (HTTP-only for security)
    // Store the actual refresh token in the cookie
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response without refreshToken in data
    return {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      message: result.message,
      path: '/auth/login',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.user;

    // Get the actual refresh token from the cookie
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const currentRefreshToken = request.cookies?.refreshToken;

    if (!currentRefreshToken) {
      return {
        data: null,
        message: 'Refresh token not found',
      };
    }

    // Pass the user ID and the current refresh token to the service
    const result = await this.authService.refresh(
      user.userId,
      currentRefreshToken,
    );

    // Set new access token cookie
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set new refresh token cookie (token rotation)
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return response with new access token only
    return {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      message: result.message,
      path: '/auth/refresh',
      data: {
        accessToken: result.accessToken,
      },
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.user;
    const result = await this.authService.logout(user.userId);

    // Clear cookies
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');

    return {
      statusCode: 200,
      timestamp: new Date().toISOString(),
      message: result.message,
      path: '/auth/logout',
      data: result.data,
    };
  }
}
